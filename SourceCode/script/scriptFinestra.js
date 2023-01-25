/*Questa pagina contiene script che gestiscono alcune funzionalità generali della
finestra di front-end, come ad esempio il funzionamento del menù principale in alto (che si attiva
quando l'utente clicca sul tasto "File") oppure l'avvio delle richieste al processo main */

//VARIABILI GLOBALI
//Variabile in cui viene conservato l'identificatore univoco della finestra.
let windowCounter;
/*Variabile con cui si tiene traccia di un path "puntato" (in cui risiede un data set di cui si vuole
iniziare l'elaborazione). Il path può essere selezionato dall'utente tramite menù apposito
oppure può arrivare dall'esterno qualora la finestra fosse stata aperta da un'altra finestra
(tramite click sul tasto "Avvia elaborazioni in una nuova finestra")*/
let currentPath = "";
/*Buffer in cui vengono parcheggiati i record letti a seguito del caricamento di un data set.
Le informazioni vengono conservate direttamente nel front end in modo da fare un'unica richiesta
al back end. Se viene "puntato" un secondo data set e l'utente sceglie di sostituire il contenuto
della finestra corrente, il contenuto di questo buffer viene sovrascritto*/
let informazioni = null;
/*Buffer in cui vengono parcheggiati gli header letti a seguito del caricamento di un data set. Il suo
contenuto viene usato per inizializzare i menù a tendina che permettono di selezionare le variabili
da studiare nei grafici.*/
let headersRicevuti = [];
/*Buffer in cui vengono parcheggiate le medie mobili calcolate nel back end tramite lo script
python. Nuove richieste sovrascrivono in parte o in tutto questo buffer (a seconda della situazione)*/
let medieMobili = null;
/*Buffer in cui viene conservata una stringa che indica il tipo di grafico rappresentato
(nella versione attuale le opzioni sono Linea, Istogramma o Scatterplot). 
Questa informazione viene consultata piuttosto spesso da diverse funzioni, ragion per cui
usare un singolo buffer globale ci risparmia il dover navigare continuamente il DOM*/
let tipoGrafico = "";

/*Funzione che si fa carico dell'attivare l'animazione di loading che viene mostrata
nella finestra front end mentre è in corso il lavoro di uno script python o il salvataggio
di un grafico come immagine.*/
function attivaAnimazioneLoading(){
    /*Se l'utente ridimensiona la finestra, il div che contiene l'animazione di loading
    viene ridimensionato a sua volta*/
    d3.select(window).on('resize', ()=>{
        let panelBox = document.getElementById("mainPanelWrapper").getBoundingClientRect();
        document.getElementById("animazioneLoading").style.height = panelBox.height + "px";
        document.getElementById("animazioneLoading").style.width = panelBox.width + "px";
    });
    /*Le dimensioni del div che contiene l'animazione di loading vengono impostate
    in modo che copra tutta la finestra ad eccezione della barra in alto*/
    let panelBox = document.getElementById("mainPanelWrapper").getBoundingClientRect();
    document.getElementById("animazioneLoading").style.height = panelBox.height + "px";
    document.getElementById("animazioneLoading").style.width = panelBox.width + "px";
    /*I componenti html dell'animazione di loading vengono caricati nel div*/
    document.getElementById("animazioneLoading").innerHTML = `
        <div id="loader" class="loader">
            <div class="inner one"></div>
            <div class="inner two"></div>
            <div class="inner three"></div>
        </div>
    `;
    /*La visibilità del div che contiene l'animazione di loading viene cambiata in modo
    da mostrarlo. Siccome ha uno z-index alto, esso copre di fatto tutta la finestra*/
    document.getElementById("animazioneLoading").style.display = "block";
    /*Durante il caricamento, il tasto "File" viene disattivato (onde evitare che l'utente
    possa inviare altre richieste al back end, che entrerebbero in conflitto)*/
    document.getElementById("tastoFile").onclick = ()=>{};
    //Vengono disattivati gli scroll laterali
    document.getElementById("body").style.overflow = "hidden";
}

/*Funzione che si fa carico del disattivare l'animazione di loading una volta completati
i calcoli del back end o il salvataggio di un grafico come immagine*/
function disattivaAnimazioneLoading(){
    /*Se l'utente ridimensiona la finestra, il comportamento che innesca torna a essere
    la creazione di un nuovo grafico le cui dimensioni combaciano con le nuove dimensioni
    della finestra (che è quello che si verifica normalmente)*/
    d3.select(window).on('resize', newFrame);
    //Il div che contiene l'animazione di caricamento viene svuotato e nascosto
    document.getElementById("animazioneLoading").innerHTML = '';
    document.getElementById("animazioneLoading").style.display = "none";
    //Viene ripristinato il funzionamento del tasto "File" del menù in alto
    document.getElementById("tastoFile").onclick = clickTastoFile;
    //Viene ripristinata la possibilità di usare gli scroll laterali
    document.getElementById("body").style.overflow = "auto";
}

/*Funzione che si fa carico del raccogliere i dati emessi come output dallo script python
che si occupa dei calcoli della media mobile. Lo script scrive questi dati su un file apposito:
la funzione per prima cosa procede a leggere suddetto file tramite la funzione "consumeJsonBuffer"
definita nello script di preload.*/
function riceviMediaMobile(){
    window.api.consumeJsonBuffer( (datiLetti) =>{
        if (datiLetti=="erroreCalcoliPython" || datiLetti=="erroreTrasmissioneDati"){
            //Se lo script python ha riportato un errore, viene mostrato un messaggio di errore
            document.getElementById("loader").innerHTML= `
                <img class="immagineLegenda" src="assets/error.png">
            `;
            document.getElementById("testoFileSelezionato").innerHTML = datiLetti;
            document.getElementById("tastoFile").onclick = clickTastoFile;
        }
        else{
            /*Se il file contiene effettivamente i risultati di un calcolo che si è risolto
            correttamente, la funzione procederà a mettere i risultati nell'apposito buffer
            "medieMobili". Il buffer medieMobili è di fatto un array di array, con ogni
            sotto-array che corrisponde a una delle linee visualizzate nel grafico Linea.
            Il calcolo delle medie mobili può riguardare (a seconda dei casi) tutte le linee
            (ad esempio se l'utente cambia il valore della smoothness) oppure solo alcune di esse
            (ad esempio se l'utente cambia la variabile associata a una delle linee o aumenta il
            numero delle linee sul grafico).*/
            let smoothness = document.getElementById("valoreSmoothness");
            /*Prima di richiedere il calcolo delle medie mobili la finestra di front end lascia
            sempre indicato nel contatore delle medie mobili quali sono gli indici del buffer
            medieMobili il cui contenuto andrà riscritto una volta arrivati i nuovi dati.*/
            let posizioneIniziale = parseInt(smoothness.getAttribute("indiceInizio"));
            let posizioneFinale = parseInt(smoothness.getAttribute("indiceFine"));
            if (posizioneIniziale!=-1){
                /*Se il valore degli indici non è -1, gli array letti dal file dei dati di output
                vengono messi nelle posizioni corrispondenti in medieMobili a partire dall'indice di partenza
                (quindi ad esempio l'array in posizione [0] finisce in posizione 
                medieMobili[indicePartenza], quello in posizione [1] finisce in posizione
                medieMobili[indicePartenza+1], etc.)'*/
                let bufferTemp = JSON.parse(datiLetti);
                let count = 0;
                posizioneIniziale = posizioneIniziale - 1;
                posizioneFinale = posizioneFinale - 1;
                while (posizioneIniziale<=posizioneFinale){
                    medieMobili[posizioneIniziale] = bufferTemp[count];
                    count = count + 1;
                    posizioneIniziale = posizioneIniziale + 1;
                }
            }
            else{
                /*Se il valore degli indici è -1, vuol dire che va riscritto semplicemente
                tutto il buffer*/
                medieMobili = JSON.parse(datiLetti);
            }
            /*Una volta ottenuti i dati, viene disattivata l'animazione "loading" e viene
            ridisegnato il grafico con i nuovi dati*/
            disattivaAnimazioneLoading();
            newFrame();
        }
    }, windowCounter);
}

/*Questa funzione emette una richiesta di calcolo per lo script python. Accetta come
input i dati su cui fare i calcoli e un oggetto in cui sono specificati il tipo
di calcolo da eseguire (più eventuali parametri necessari al calcolo). Allo stato attuale
l'unico calcolo possibile è la media mobile (con la dimensione della finestra come parametro
allegato).*/
function chiediDatiPython(tipoCalcolo, data){
    if (tipoCalcolo["calcolo"]=="mediaMobile"){
        attivaAnimazioneLoading(); //Viene attivata l'animazione "loading"
        let jArgs = [];
        //Tra i parametri passati al back end c'è anche l'identificatore della finestra che ha avviato la chiamata
        jArgs.push(windowCounter);
        jArgs.push(JSON.stringify(tipoCalcolo));
        window.api.createJsonBuffer(jArgs, data);
    }
}

/*Funzione che si fa carico del raccogliere il data set emesso come output dallo script python
che si occupa del caricare i dati da un file. Lo script scrive il data set su un file apposito:
la funzione per prima cosa procede a leggere suddetto file tramite la funzione "consumeJsonBuffer"
definita nello script di preload.*/
function riceviDataFrame(data){
    window.api.consumeJsonBuffer( (datiLetti) =>{
        if (datiLetti=="erroreDataLoader" || datiLetti=="erroreTrasmissioneDati"){
            //Se lo script python riporta un errore, viene visualizzato un messaggio di errore
            document.getElementById("loader").innerHTML= `
                <img class="immagineLegenda" src="assets/error.png">
            `;
            document.getElementById("testoFileSelezionato").innerHTML = datiLetti;
            document.getElementById("tastoFile").onclick = clickTastoFile;
        }
        else{
            /*Se il file contiene effettivamente un data set, ne vengono copiati gli header
            nell'apposito buffer headersRicevuti*/
            let fields = (JSON.parse(datiLetti)["schema"])["fields"];
            let count = 1;
            while (count < fields.length){
                headersRicevuti.push((fields[count])["name"]);
                count = count + 1;
            }
            /*Il resto dei dati (ovvero i record veri e propri) vengono invece messi
            nel buffer "informazioni"*/
            informazioni = JSON.parse(datiLetti)["data"];
            //Vengono quindi attivati la pulsantiera, il grafico e il tasto "Salva" del menù "File"
            document.getElementById("graphicOptionBar").style.display = "flex";
            document.getElementById("graphicWrapper").style.display = "flex";
            document.getElementById("tastoSalva").style.display = "block";
            //Viene inoltre modificata la barra di navigazione in alto per riportare il nome del data set caricato
            document.getElementById("testoFileSelezionato").innerHTML = "DataSet caricato: " + currentPath;
            //Viene disattivata l'animazione "loading"
            disattivaAnimazioneLoading();
            //Viene attivata la funzione che si occupa di riempire la pulsantiera
            creaPulsantiera();
            /*Il path da cui era stato caricato il data set non serve più, quindi le variabili
            usate per "puntarlo" vengono resettate*/
            currentPath = "";
            document.getElementById("selezioneFile").value = null;
        }
    }, windowCounter);
}

/*Funzione che emette la richiesta di caricamento dati. Al back end vengono
passati come parametri il path "puntato" (corrispondente al file in cui si trova
il data set da caricare) e l'identificativo univoco della finestra.'*/
function chiediDataFrame(){
    if (currentPath!=""){
        attivaAnimazioneLoading();
        let jArgs = [windowCounter, currentPath];
        window.api.send("requestRawData", jArgs);
    }
}

/*Questa funzione viene innescata non appena l'utente "punta" un nuovo file tramite
il tasto "Carica un data set" del menù "File". Essa costituisce uno step intermedio
subito prima della richiesta di caricamento vera e propria, il cui scopo è assicurarsi
che non ci sia già un altro data set caricato in memoria.*/
function inizioRichiestaDati(){
    if (informazioni!=null){
        /*Se è già presente un altro dataset, viene attivato un popup da cui l'utente deve
        scegliere il da farsi: annullare l'operazione, caricare comunque i dati sostituendo
        i dati correnti oppure caricare i dati in una nuova finestra.*/
        let boxPopup = document.getElementById("boxPopup");
        boxPopup.innerHTML = `
            <div class="messaggioPopup">
                <span>Nella finestra corrente sono gi&agrave stati caricati dei dati. Sostituirli?</span>
            </div>
            <div class="gruppoBottoniPopup">
                <button class="bottonePremibile bottonePopup" id="popupSostituisci">Sostituisci</button>
                <button class="bottonePremibile bottonePopup" id="popupNuovaFinestra">Apri in nuova finestra</button>
                <button class="bottonePremibile bottonePopup" id="popupAnnulla">Annulla</button>
            </div>
        `;
        document.getElementById("popupAnnulla").onclick = annullaEChiudiPopup;
        document.getElementById("popupNuovaFinestra").onclick = apriElaborazioniInNuovaFinestra;
        document.getElementById("popupSostituisci").onclick = sostituisciContenutoECaricaNuoviDati;
        document.getElementById("panelPopup").style.display = "block";
        boxPopup.style.display = "flex";
    }
    else
        //Se non è presente un data set in memoria, viene avviata direttamente la richiesta di caricamento
        chiediDataFrame();
}

/*Questa funzione viene innescata se l'utente clicca sul tasto "Apri in nuova finestra"
del popup che si apre quando viene chiesto un caricamento ma è già presente un data set in memoria*/
function apriElaborazioniInNuovaFinestra(){
    //Dopo il click sul tasto, per prima cosa viene chiuso il popup
    document.getElementById("panelPopup").style.display = "none";
    document.getElementById("boxPopup").style.display = "none";
    /*Viene poi mandata al backend la richiesta volta ad aprire una nuova finestra, la quale
    nascerà con un path già "puntato" da cui caricherà immediatamente i dati*/
    window.api.send("requestInNewWindow", currentPath);
    /*Una volta inviata la richiesta per la nuova finestra il path puntato non serve più,
    quindi le variabili associate vengono resettate*/
    currentPath = "";
    document.getElementById("selezioneFile").value = null;
}

/*Questa funzione viene innescata se l'utente clicca sul tasto "Annulla"
del popup che si apre quando viene chiesto un caricamento ma è già presente un data set 
in memoria. La funzione si limita a chiudere il popup e resettare le variabili che
tengono traccia del path "puntato"*/
function annullaEChiudiPopup(){
    currentPath = "";
    document.getElementById("selezioneFile").value = null;
    document.getElementById("panelPopup").style.display = "none";
    document.getElementById("boxPopup").style.display = "none";
}

/*Questa funzione viene innescata se l'utente clicca sul tasto "Sostituisci"
del popup che si apre quando viene chiesto un caricamento ma è già presente 
un data set in memoria.*/
function sostituisciContenutoECaricaNuoviDati(){
    //Per prima cosa viene attivata l'animazione "Loading"
    attivaAnimazioneLoading();
    //Vengono svuotati sia il buffer "informazioni" che quello "headersRicevuti"
    informazioni = null;
    while (headersRicevuti.length > 0)
        headersRicevuti.pop();
    //Viene chiuso il popup
    document.getElementById("panelPopup").style.display = "none";
    document.getElementById("boxPopup").style.display = "none";
    //Infine viene fatta partire la richiesta dati
    chiediDataFrame();
}

function chiudiMenu(){
    let nm = document.getElementById("navigationMenu");
    if (nm.classList.contains("show"))
        nm.classList.remove("show");
    window.removeEventListener("click",chiudiMenu);
}

/*Questa funzione viene attivata quando l'utente clicca sul tasto "File" del menù
di navigazione in alto.*/
function clickTastoFile(){
    let nm = document.getElementById("navigationMenu");
    /*Se il menù di navigazione è chiuso, il click lo apre rendendolo visibile.
    Viceversa, se il menù era già aperto un secondo click su "File" lo chiude.*/
    nm.classList.toggle("show");
    if (nm.classList.contains("show")){
        /*Se il click ha appena aperto il menù, viene aggiunto un listener alla window 
        che procede a chiudere automaticamente il menù al prossimo click dell'utente 
        (ovunque esso avvenga). Il listener viene incapsulato in un altro listener perché
        l'evento "click" originale ancora non si è concluso, ragion per cui il singolo 
        click su window verrebbe "consumato" subito*/
        window.addEventListener("click", function(){
            window.addEventListener("click",chiudiMenu,{once:true});
        }, {once:true});
    }
    else{
        //Se il click ha appena chiuso il menù viene rimosso l'eventuale listener da window
        window.removeEventListener("click",chiudiMenu);
    }
}

/*Questa funzione si attiva quando l'utente clicca sul tasto "FullScreen" in alto a destra
del grafico. Prende come input un riferimento al tasto fullScreen stesso e un riferimento
al wrapper che incapsula l'area del documento html in cui si trova il grafico disegnato*/
function goFullScreen(selfRef, graphicWrapper){
    /*Dopo il click, il tasto fullScreen diventa il tasto "normalSize" con cui tornare
    alle dimensioni originali, per cui ne vengono cambiati il title e l'aspetto grafico*/
    selfRef.src="assets/normalSize.png";
    selfRef.title="Esci da schermo intero";
    /*Le impostazioni di stile del grafico vengono cambiate in modo da fargli coprire tutto
    il resto*/
    graphicWrapper.classList.add("fullScreen");
    graphicWrapper.style.margin = "0px";
    /*L'evento on click del tasto viene cambiato: al prossimo click tornerà tutto alle
    dimensioni normali*/
    selfRef.onclick = ()=> {goNormalSize(selfRef, graphicWrapper);};
    //Viene attivata la richiesta di full screen e viene ridisegnato il grafico
    document.documentElement.requestFullscreen();
    newFrame();
    /*Se la finestra cambia dimensioni (a causa del fatto che l'utente preme il tasto ESC,
    viene reinizializzato il tasto fullScreen. Similmente a come avveniva per il listener
    di window che chiude il menù di navigazione, anche questo listener deve venir incapsulato
    in un altro listener o verrà innescato subito.*/
    window.onresize = ()=>{
        window.onresize = ()=>{resettaTastoFullScreen(selfRef, graphicWrapper)};
    };
}

/*Questa funzione viene innescata se l'utente esce dalla modalità full screen
premendo il tasto "Esc" invece che il tasto sulla barra del grafico. La funzione
fa sostanzialmente le stesse cose di "goNormalSize", ovvero ripristinare il tasto
full screen al suo aspetto originale, ripristinare il listener originale di window.onresize
e ridisegnare il grafico.*/
function resettaTastoFullScreen(tastoFullScreen, graphicWrapper){
    tastoFullScreen.src="assets/fullScreen.png";
    tastoFullScreen.title="Schermo intero";
    graphicWrapper.classList.remove("fullScreen");
    graphicWrapper.style.margin = "3px";
    tastoFullScreen.onclick = ()=> {goFullScreen(tastoFullScreen, graphicWrapper);};
    window.onresize = newFrame;
    newFrame();
}

/*Questa funzione viene attivata quando l'utente esce dalla modalità schermo intero premendo
il tasto sulla barra del grafico. La funzione ripristina il tasto full screen al suo aspetto
originale, ripristina il listener originale di window.onresizee ridisegna il grafico.*/
function goNormalSize(selfRef, graphicWrapper){
    selfRef.src="assets/fullScreen.png";
    selfRef.title="Schermo intero";
    graphicWrapper.classList.remove("fullScreen");
    graphicWrapper.style.margin = "3px";
    selfRef.onclick = ()=> {goFullScreen(selfRef, graphicWrapper);};
    window.onresize = newFrame;
    document.exitFullscreen();
    newFrame();
}

/*Questa funzione inizializza la finestra non appena viene creata*/
function windowInitialize(){
    //Ogni volta che viene cambiato il tipo di grafico, viene aggiornata la pulsantiera
    document.getElementById("tipoGrafico").onchange = creaPulsantiera;
    //Ogni volta che viene "puntato" un nuovo path, viene avviata la richiesta dati
    document.getElementById("selezioneFile").onchange = ()=>{
        let f = document.getElementById("selezioneFile").files[0];
        if (f!=undefined){
            currentPath = f.path;
            inizioRichiestaDati();
        }  
    };
    //Viene attivato il tasto full screen (anche se ancora non è visibile)
    document.getElementById("tastoFullScreen").onclick = ()=>{
        goFullScreen(document.getElementById("tastoFullScreen"), document.getElementById("graphicWrapper"));
    };
    //Viene attivato il tasto salva (anche se ancora non è visibile)
    document.getElementById("tastoSalva").onclick = ()=>{
        window.api.saveFile(preparaSalvataggio, ripristinaDopoSalvataggio, toBlob);
    };
    //Viene attivato il tasto "File" del menù
    document.getElementById("tastoFile").onclick = clickTastoFile;
    /*Viene predisposto il lancio delle funzioni "riceviDataFrame" e "riceviMediaMobile"
    ogni volta che la finestra riceve una comunicazione sui canali "rawDataReady" e
    "mediaMobileReady" rispettivamente. */
    window.api.receive("rawDataReady", riceviDataFrame);
    window.api.receive("mediaMobileReady", riceviMediaMobile);
    /*Se al momento della sua nascita la finestra riceve anche una comunicazione
    sul canale "startingDataFromMainToWindow", viene attivata una funzione
    che procede a raccogliere la stringa ricevuta e a trasformarla nel path "puntato",
    del quale viene subito avviato il caricamento*/
    window.api.receive("startingDataFromMainToWindow", (data)=>{
        windowCounter = data[0];
        currentPath = data[1];
        if (currentPath!=""){
            inizioRichiestaDati();
        }
    });
}