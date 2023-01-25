/*Lo script di preload è una particolarità di Electron il cui scopo è fornire alla finestra
di front end almeno uno script in cui è possibile caricare i moduli di node (come ad esempio
fs e path), cosa che altrimenti non è permessa. In questo senso è fondamentale la funzione
contextBridge.exposeInMainWorld perché permette di incapsulare funzionalità implementate
tramite i moduli di node (che quindi devono essere tassativamente scritte in questo script
e non altrove) all'interno di funzioni che possono essere chiamate nella finestra front end
a partire dall'identificatore "window". Ad esempio, per salvare il grafico su file la finestra
di front end può chiamare la funzione window.api.saveFile (che è definita qui).*/

//Moduli importati che vengono usati nelle funzioni definite in questo script.
const {contextBridge,ipcRenderer} = require("electron");
const fs = require("fs");
const path = require('path');

// Expose protected methods
contextBridge.exposeInMainWorld(
    "api", {
        /*Funzione usata dalla finestra di front end per inviare comunicazioni al back end.
        Accetta come parametri il nome di un canale di comunicazione e i dati da inviare*/
        send: (channel, data) => {
            //Qui è definita la lista di canali validi (verso il back end)
            let validChannels = ["requestInNewWindow", "requestRawData"];
            /*Se il canale usato dalla finestra di front end è un canale valido, viene 
            avviato l'invio dati tramite ipcRenderer */
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        /*Funzione usata dalla finestra di front end per ricevere comunicazioni dal back end.
        Accetta come parametri il nome di un canale di comunicazione e la funzione da invocare
        non appena arriva una comunicazione su quel canale*/
        receive: (channel, func) => {
            //Qui è definita la lista dei canali validi (dal back end)
            let validChannels = ["startingDataFromMainToWindow", "rawDataReady", "mediaMobileReady"];
            /*Se il canale specificato in input corrisponde effettivamente a uno di quelli usati
            dal back end, l'ipcRenderer viene messo in ascolto su quel canale: all'arrivo di
            comunicazioni su quel canale (contenenti determinati dati), verrà invocata in risposta
            la funzione specificata (func)*/
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event,data) => func(data));
            }
        },
        /*Funzione usata dalla finestra di front end per raccogliere delle informazioni
        scritte su un file di output prodotto dal back end in formato JSON. Accetta
        come input una funzione che si farà carico di elaborare i dati letti e l'identificatore
        univoco della finestra*/
        consumeJsonBuffer: (func, identificatoreFinestra) => {
            /*Il path del file è sempre composto dall'identificatore della finestra seguito dal suffisso "To"
            e risiede nella cartella "bridge"*/
            let pathFile = path.join(".\\bridge", identificatoreFinestra+"To.txt");
            fs.readFile(pathFile, 'utf-8', (err, data) => {
                if (err) {
                    console.log(err);
                    fs.unlink(pathFile, ()=>{
                        //Se avviene un errore in fase di lettura il front end viene notificato con un errore 
                        func("erroreTrasmissioneDati");
                    });  
                }
                else{
                    fs.unlink(pathFile, ()=>{
                        //Se non avviene nessun errore, viene invocata una funzione specifica indicata dal front end
                        func(data);
                    });
                }
            });
        },
        /*Funzione usata dalla finestra di front end per creare un file buffer in cui parcheggiare
        temporaneamente i dati (in formato JSON) che dovranno essere letti dal back end per
        farci sopra delle elaborazioni. Accetta come input un array di arguments (che viene
        passato al back end tramite ipcRenderer) e i dati da scrivere su file*/
        createJsonBuffer: (jArgs, data) => {
            //l'array di argument contiene anche l'identificatore univoco della finestra
            let identificatoreFinestra = jArgs[0];
            //Il file buffer prodotto ha sempre lo stesso nome, composto dall'identificatore univoco seguito dal suffisso "From"
            fs.writeFile(path.join(".\\bridge",identificatoreFinestra+"From.txt"), JSON.stringify(data), function (err){
                if (err)
                    console.log(err);
                else //Se non si verificano errori in fase di scrittura, viene inviata una comunicazione al back end per iniziare le elaborazioni
                    ipcRenderer.send("requestPythonData", jArgs);
            });
        },
        /*Funzione usata dal front end per iniziare il salvataggio di un grafico come file.
        Accetta come input gli identificatori di due funzioni: una che si fa carico del preparare
        il grafico al salvataggio e una che si fa carico del suo ripristino al suo stato originale
        quando il salvataggio è finito. E' necessario passare le funzioni come parametri perché
        gli script di questa pagina non possono accedere agli identificatori definiti negli altri
        script della finestra di front end.*/
        saveFile: async function(preparaSalvataggio, ripristinaDopoSalvataggio, toBlob) {
            //Opzioni per il prompt di salvataggio
            const opts = {
                //Nome predefinito
                suggestedName: document.getElementById("tipoGrafico").value+'.jpg',
                //Cartella di salvataggio predefinita
                startIn: 'desktop',
                //Tipi di formato accettati
                types: [
                    {
                        accept: {'image/jpeg': ['.jpg']}
                    },
                    {
                        accept: {'image/png': ['.png']}
                    },
                    {
                        accept: {'image/svg+xml': ['.svg']}
                    }
                ],
            };
            try{
                /*Il menù "save file picker" offerto dall'API File System viene messo a disposizione
                dell'utente per scegliere nome del file, formato e destinazione*/
                let fileHandle = await window.showSaveFilePicker(opts);
                //Dal file handle creato dal save file picker si può accedere al nome del file e quindi alla sua estensione
                let extension = fileHandle.name.substr(fileHandle.name.length - 3);
                //Creazione dell'oggetto "writable" con cui si scrive su file (a partire dal file handle, come specificato dall'API File System)
                let writable = await fileHandle.createWritable();
                /*La funzione preparaSalvataggio restituisce come risultato le dimensioni originali del grafico
                in modo da poterle usare nuovamente una volta finito il salvataggio. Vengono quindi pacheggiate
                in una variabile*/
                let dimensioniOriginali = await preparaSalvataggio(extension);
                /*Se il formato del file è SVG all'interno du esso viene salvato semplicemente
                l'html mostrato normalmente nell'App. Se invece il formato è jpg o png allora
                l'html deve prima essere convertito a un'immagine rasterizzata tramite l'API
                dom-to-image. In entrambi i casi il grafico viene poi ripristinato al suo stato
                originale tramite la funzione di ripristino.*/
                if (extension=="svg"){
                    await writable.write(document.getElementById("graphicArea").innerHTML);
                    await writable.close();
                    ripristinaDopoSalvataggio(dimensioniOriginali[0], dimensioniOriginali[1]);
                }
                else if (extension=="jpg" || extension=="png"){
                    toBlob(document.getElementById("graphicWrapper"))
                        .then(async function (blob) {
                            await writable.write(blob);
                            await writable.close();
                            ripristinaDopoSalvataggio(dimensioniOriginali[0], dimensioniOriginali[1]);
                        });
                }
            }
            catch (AbortError){
                /*Se l'utente chiude il menù di salvataggio annullando l'operazione
                viene normalmente innescata un'eccezione. Nel nostro caso la intercettiamo
                senza fare nulla.*/
            }
        }
    }
);
