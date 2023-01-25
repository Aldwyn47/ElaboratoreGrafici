/*Questo script è il Main dell'App Electron. In quanto tale costituisce il cuore del programma,
giacché regola la creazione delle singole finestre del front-end e gestisce l'invocazione degli
script Python (facendo anche da intermediario nella comunicazione con essi) '*/

const {app, BrowserWindow, ipcMain} = require('electron');

//aggiunta del modulo fs, usato per alcune operazioni di I/O su file
const fs = require('fs'); 
//aggiunta del modulo path, usato per gestire meglio i path dei file
const path = require('path');

//Path in cui risiede il file di logging degli errori
let logfile = path.join(process.cwd(),"DebugLog.txt");
//Prefisso con cui viene completato il path degli eseguibili python in caso di impacchettamento
let prefissoPython = "";

//Viene lanciata la funzione che si occupa dell'inizializzazione App
initialize();

/*Siccome abbiamo fatto uso di command line switch, il codice del main deve essere
incapsulato in modo tale che venga eseguito solo dopo che gli switch sono entrati
in azione.*/
app.whenReady().then(()=>{
    
    //Modulo child process, usato per lanciare gli script python come sottoprocessi
    const {spawn} = require('child_process');
    
    //L'identificatore Menu (sempre dal modulo Electron) può essere usato per disattivare il menu di default fornito da Electron
    const { Menu } = require('electron');
    
    /*Variabile globale che viene aggiornata ogni volta che una nuova finestra front-end viene generata dal main.
    Non serve a tenere traccia del loro numero, quanto piuttosto a garantire che ognuna abbia
    un identificatore numerico che la distingua in modo univoco*/
    let count = 1;
    
    /*funzione usata dal Main per generare una nuova finestra front-end. Accetta come parametro
    una stringa startingPath che può essere la stringa vuota o il path di un file. Se è il path
    di un file, la finestra appena creata provvederà subito a caricare il file in questione 
    come data set.*/
    function newWindow(startingPath) {
        const win = new BrowserWindow({
            width: 800, /*AMPIEZZA AL MOMENTO DELLA CREAZIONE*/
            height: 600, /*ALTEZZA AL MOMENTO DELLA CREAZIONE*/
            minWidth: 700, /*LARGHEZZA MINIMA*/
            minHeight: 500, /*ALTEZZA MINIMA*/
            webPreferences: {
                /*impostazioni varie che in teoria rendono il programma più sicuro, rendendo più
                difficile ai processi renderer (che gestiscono le finestre front end) l'accesso 
                all'ambiente node.js. Non credo che modificandole ci sarebbero grosse conseguenze negative*/
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                sandbox: false,
                preload: path.join(__dirname , "\\script\\preload.js") //Path dove risiede lo script di preload
            },
        });
        /*Appena la finestra è pronta viene usato un canale di comunicazione specifico per
        inviarle due informazioni fondamentali: il suo identificativo numerico e il suo
        startingPath (che la funzione ha a sua volta ricevuto dall'esterno)*/
        win.once('ready-to-show', () => {
            win.webContents.send("startingDataFromMainToWindow", [count, startingPath]);
            win.show();
            count = count + 1; //Il contatore viene poi alzato di uno in modo che la prossima finestra avrà un identificativo diverso
        });
        //Con questa funzione viene caricato dell'html nella finestra appena creata
        win.loadFile('newWindow.html');
    }

    /*L'identificatore ipcMain fornito da Electron si usa per istruire il processo main sul
    cosa fare quando riceve una comunicazione su determinati canali tramite ipc (che sta per
    inter process communication ed è la feature di base fornita da Electron per permettere
    una comunicazione bidirezionale tra processo main e processi renderer)*/
    
    /*Se arriva una comunicazione sul canale "requestInNewWindow" significa che una finestra
    già esistente sta richiedendo l'apertura di una nuova finestra in cui iniziare l'elaborazione
    di un nuovo data set (in modo da non sovrascrivere un vecchio data set già presente nella
    finestra che ha inviato questa richiesta). Tra i due parametri event è un parametro di default
    previsto da Electron che non viene usato, mentre args contiene il path del nuovo data set
    su cui dovrà lavorare la nuova finestra, che viene quindi passato subito alla funzione
    che si occupa del creare la nuova finestra*/
    ipcMain.on("requestInNewWindow", (event, args) => {
        newWindow(args);
    });

    /*Se arriva una comunicazione sul canale "requestRawData" significa che una finestra vuole
    ottenere le informazioni contenute in un file (che costituisce un data set). La lettura 
    dei dati da questo file è affidata a uno script python ben preciso (dataLoader.py). Il
    main procede quindi a invocare come sottoprocesso suddetto script passandogli i parametri
    che la finestra ha allegato alla sua richiesta. Quando il processo termina, il main invia
    inoltre alla finestra originale una comunicazione sul canale "rawDataReady", per segnalare
    che i dati richiesti sono pronti e la finestra può quindi procedere al loro ritiro. Il motivo
    per cui i dati non vengono fatti passare dallo stesso processo main è che IPC per qualche motivo non
    fa passare dati eccessivamente grandi e si è reso quindi necessario implementare delle "pipe
    artigianali" che consistono nella scrittura e lettura da file .txt (in questo caso qui il 
    processo python scrive e il processo renderer della finestra legge).*/
    ipcMain.on("requestRawData", (event, jArgs) => {
        /*Tramite getFocusedWindow() il processo main si salva un riferimento che identifica la
        finestra che ha inviato inizialmente la richiesta. Questa operazione va fatta tassativamente
        come prima cosa perché tra la ricezione iniziale della richiesta e la fine delle elaborazioni
        di python possono passare anche diversi secondi, durante i quali l'utente potrebbe spostare
        il focus su un'altra finestra portando a errori.*/
        let win = BrowserWindow.getFocusedWindow();
        let arguments = [];
        let command = "";
        if (prefissoPython==""){
            command = "python";
            arguments.push(".\\python\\DataLoader.py");
        }
        else
            command = '.'+prefissoPython+'\\python\\DataLoader.exe';
        arguments.push(jArgs[0]);
        arguments.push(jArgs[1]);
        const elab = spawn(command,arguments);
        elab.stdout.on('data', function (data) {
            console.log(data.toString());
        });
        elab.stderr.on('data', function (data) {
            console.log(data.toString());
        });
        elab.on('close', (code) => {
            if ( !(win.isDestroyed()))
                win.webContents.send("rawDataReady", "ping");
        });
    });

    /*Se il main riceve una comunicazione sul canale "requestPythonData" significa che una
    finestra ha richiesto delle elaborazioni da svolgere in python su dati appartenenti al
    data set su cui sta lavorando la finestra. Al momento in cui arriva questa richiesta, la
    finestra avrà già provveduto a preparare i dati e lasciarli in un opportuno file da cui lo
    script python che si occupa dei calcoli (dataProcessor.py) potrà leggerli. Il main deve
    quindi solo occuparsi dello svegliare lo script python, passargli i parametri allegati dalla
    finestra e infine mandare una notifica alla finestra quando lo script python ha terminato il
    lavoro (similmente a come accade per il canale "requestRawData").*/
    ipcMain.on("requestPythonData", (event, jArgs) => {
        let win = BrowserWindow.getFocusedWindow();
        let arguments = [];
        let command = "";
        if (prefissoPython==""){
            command = "python";
            arguments.push(".\\python\\DataProcessor.py");
        }
        else
            command = '.'+prefissoPython+'\\python\\DataProcessor.exe';
        arguments.push(jArgs[0]);
        arguments.push(jArgs[1]);
        const elab = spawn(command,arguments);
        elab.stdout.on('data', function (data) {
            console.log(data.toString());
        });
        elab.stderr.on('data', function (data) {
            console.log(data.toString());
        });
        elab.on('close', (code) => {
            /*Quando lo script python ha finito il main si occupa anche di cancellare il file .txt
            che conteneva i dati di input preparati dalla finestra.*/
            fs.unlink(path.join(".\\bridge",jArgs[0]+"From.txt"), ()=>{});
            /*La notifica viene inviata su un canale specifico associato al calcolo specifico
            richiesto dalla finestra. Al momento l'unico che esiste è "mediaMobile"*/
            if ( !(win.isDestroyed()) && (JSON.parse(jArgs[1])["calcolo"])=="mediaMobile")
                win.webContents.send("mediaMobileReady", "ping");
        });
    });

    /*Questa funzione entra in gioco solo se il sistema operativo è MacOS, e serve
    a rilanciare una finestra se non ce ne sono attive (MacOS si comporta in modo
    piuttosto diverso dagli altri OS ed Electron non può gestirlo in modo automatico 
    senza l'intervento del programmatore)*/
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) newWindow("")
    });

    /*Questa funzione si occupa di chiudere il processo main se tutte le finestre sono state chiuse.
    La chiusura ha luogo solo se il sistema operativo non è MacOS, perché MacOS si comporta in modo diverso.*/
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    });
    
    /*Questa funzione entra in gioco quando l'applicazione viene chiusa e 
    si occupa di eliminare tutte le "pipe artigianali" qualora ne fossero sopravvissute
    a causa di errori. Esse risiedono tutte nella sottocartella "bridge".*/
    app.on('close', ()=>{
        fs.readdir(".\\bridge", (err, files) => {
            if (err)
                console.log(err);
            else{
                for (const file of files) {
                    fs.unlink(path.join(".\\bridge", file), (err) => {
                        if (err) console.log(err);
                    });
                }
            }
        });
    });
        
    Menu.setApplicationMenu(null); //ESCLUDIAMO IL MENU DI DEFAULT DI ELECTRON al lancio

    /*A ogni nuovo lancio dell'applicazione viene eseguita la stessa pulizia delle
    "pipe artigianali" che avviene al momento della chiusura*/
    fs.readdir(".\\bridge", (err, files) => {
        if (err){}
        else{
            for (const file of files) {
                fs.unlink(path.join(".\\bridge", file), (err) => {
                    if (err)
                        console.log(err);
                });
            }
        }
    });
    
    /*A ogni nuovo lancio dell'applicazione viene aperta una prima finestra
    priva di startingPath*/
    newWindow("");
});

//Questa funzione si fa carico di alcune operazioni fondamentali di inizializzazione
async function initialize(){
    /*Viene lanciata questa funzione per assicurarsi che alcune directory
    e file fondamentali effettivamente esistano. Se non esistono, vengono creati.*/
    await prepareVitalDirectories();
    //command line switch forniti da Electron che permettono di abilitare il logging degli errori (sul file specificato da noi)
    app.commandLine.appendSwitch('log-file', logfile); 
    app.commandLine.appendSwitch('enable-logging'); 
    /*command line switch fornito da Electron per abilitare alcune feature sperimentali. 
    E' necessario per far sì che l'API File System con cui si salvano i grafici come immagine 
    ottenga automaticamente i permessi per lavorare sui file destinazione*/
    app.commandLine.appendSwitch("enable-experimental-web-platform-features");
}

/*Questa funzione si assicura che esistano alcune directory fondamentali
per il funzionamento dell'app. Se non funzionano, vengono create*/
async function prepareVitalDirectories(){
    /*A ogni nuovo lancio dell'applicazione nel file di Log degli errori viene aggiunto
    un separatore che indica anche la data e l'ora del lancio. Se la funzione appendFile
    non riesce a trovare il file in cui scrivere procede a crearne uno ma innesca
    anche un errore enoent.*/
    await fs.appendFile(logfile,"\n\n***"+new Date().toJSON().slice(0, 19)+"***\n",function (err){
        if(err){
            /*In caso di errore il file viene comunque creato, ma la scrittura fallisce, perciò
            viene chiesta la scrittura una seconda volta.*/
            fs.appendFile(logfile,"\n\n***"+new Date().toJSON().slice(0, 19)+"***\n",function (err){
                if(err){
                    console.log(err);
                }
            });
        }
    });
    /*Ci si assicura che esista la cartella "bridge" in cui risiedono le "pipe artigianali"
    usate per la comunicazione bilaterale tra front end e back end*/
    await fs.access(".\\bridge", function(error) {
        if (error) {
            fs.mkdir(".\\bridge", function(err) {
                if (err) console.log(err);
            })
        }
    });
    /*Se risulta visibile una directory "resources" significa che l'app è stata impacchettata,
    perciò il prefisso dei path degli eseguibili Python viene aggiornato*/
    try{
        await fs.access(".\\resources", function(error) {
            if (error) {}
            else
                prefissoPython = "\\resources\\app";
        });
    }
    catch(err){}
}

