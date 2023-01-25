/*Questi script contengono le funzioni che si fanno carico della creazione dei grafici
a partire dal data set caricato nella finestra di front end. La libreria di riferimento
che è stata usata è D3, e i grafici creati sono basati su svg.*/

/*COSTANTI GLOBALI DI SISTEMA*/
/*LIMITE AL NUMERO DI LINEE CHE SI POSSONO MOSTRARE CONTEMPORANEAMENTE IN UN GRAFICO DI TIPO LINEA. 
NELL'IMPLEMENTAZIONE ATTUALE NON VA MAI IMPOSTATO SOPRA 7 O SI VERIFICHERANNO ERRORI.*/
const capNumeroLinee = 3;
/*LIMITE MASSIMO PER LA DIMENSIONE DELLA FINESTRA USATA PER IL CALCOLO DELLE MEDIE MOBILI IN
CASO DI GRAFICO DI TIPO LINEA*/
const capSmoothness = 100;
/*LIMITE MASSIMO PER IL NUMERO DI CLASSI CHE PUO' AVERE UN GRAFICO DI TIPO ISTOGRAMMA*/
const capBin = 150;
/*LIMITE MASSIMO PER I PUNTI VISIBILI USATO NEI GRAFICI DI TIPO LINEA O SCATTERPLOT. IL
LIMITE MINIMO E' ESATTAMENTE LA META' (SE IL VALORE AD ESEMPIO E' 50000 UN GENERICO 
GRAFICO CONTERRA' DAI 25000 AI 50000 PUNTI CIRCA)*/
const capPuntiVisibili = 30000;
/*COLORI USATI PER DISEGNARE I GRAFICI. LA VARIANTE OPACA DI OGNI COLORE VIENE USATA
SOLO IN CASO DI MEDIE MOBILI (NEL QUAL CASO LA MEDIA MOBILE VIENE RAPPRESENTATA IN ACCESO
E LA LINEA ORIGINALE IN OPACO)*/
const colori = [
    {
        opaco : "skyblue",
        acceso : "mediumblue"
    },
    {
        opaco : "palegreen",
        acceso : "green"
    },
    {
        opaco : "lightpink",
        acceso : "crimson"
    },
    {
        opaco : "lemonchiffon",
        acceso : "gold"
    },
    {
        opaco : "plum",
        acceso : "darkviolet"
    },
    {
        opaco : "silver",
        acceso : "lightslategrey"
    },
    {
        opaco : "burlywood",
        acceso : "chocolate"
    }
];

/*MARGINI DEL GRAFICO*/
const marginGraph = {
    top: 20,
    right: 20,
    bottom: 40,
    left: 50
};

/*Buffer in cui vengono messi i dati del grafico. Questo buffer secondario viene inizializzato
e riempito in modo opportuno partendo dai dati contenuti in "informazioni", che non vengono
mai alterati. In questo modo se l'utente decide di cambiare le impostazioni del grafico
non sarà necessario chiedere nuovamente al back end il data set*/
let buffer = {
    width : null,
    height : null,
    svg : null,
    dataX : null,
    dataY : null,
    x : null,
    y : null,
    centroX : null,
    centroY : null,
    minX : null,
    maxX : null,
    minY : null,
    maxY : null,
    zoomedMinX : null,
    zoomedMaxX : null,
    zoomedMinY : null,
    zoomedMaxY : null
};

/*Questa funzione si fa carico di riassegnare nuove dimensioni al grafico (per poi
ridisegnarlo subito dopo). Viene normalmente innescata quando la finestra cambia
dimensione.*/
function newFrame(){
    //Per prima cosa si distrugge il vecchio grafico
    let svg = d3.select("svg");
    if (svg!=null)
        for (s of svg)
            s.remove();
    let frame = document.getElementById("graphicArea");
    //Le dimensioni del nuovo grafico vengono tarate in base al div che le contiene
    buffer["width"] = frame.offsetWidth - marginGraph.left - marginGraph.right - 16;
    buffer["height"] = frame.offsetHeight - marginGraph.top - marginGraph.bottom - 16;
    //Gli assi vengono aggiornati in modo che la loro lunghezza non sfori le dimensioni del grafico
    aggiornaAsse("x");
    aggiornaAsse("y");
    //Il grafico viene ridisegnato
    reDraw();
    //Se il grafico non è un istogramma, vengono anche salvate le coordinate del centro cartesiano
    if (tipoGrafico!="Istogramma"){
        let xBox = document.getElementById("xAxis").getBoundingClientRect();
        let yBox = document.getElementById("yAxis").getBoundingClientRect();
        buffer["centroX"] = (yBox.x+yBox.width);
        buffer["centroY"] = (xBox.y);
    }
}

/*Questa funzione si fa carico dell'inizializzazione degli assi, dando loro
una lunghezza e una scala. Accetta come parametro una stringa ("x" o "y") che
specifica l'asse che si vuole aggiornare*/
function aggiornaAsse(axis){
    if (axis=="x"){
        /*Se "zoomedMinX" è in uso vuol dire che è stato effettuato uno zoom
        su una porzione del grafico e vanno quindi presi come estremi per l'asse
        gli estremi della porzione di grafico su cui è stato fatto lo zoom*/
        if (buffer["zoomedMinX"]!=null){
            buffer["x"] = d3.scaleLinear()
                .range([0, buffer["width"]])
                .domain([buffer["zoomedMinX"],buffer["zoomedMaxX"]]);
        }
        else{
            /*Se non è in corso uno zoom gli estremi saranno semplicemente gli estremi
            dell'array di dati usati per l'asse X*/
            buffer["x"] = d3.scaleLinear()
                .range([0, buffer["width"]])
                .domain([buffer["minX"],buffer["maxX"]]);
        }
    }
    else{
        if (buffer["zoomedMinY"]!=null){
            buffer["y"] = d3.scaleLinear()
                .range([buffer["height"], 0])
                .domain([buffer["zoomedMinY"],buffer["zoomedMaxY"]]);
        }
        else{
            buffer["y"] = d3.scaleLinear()
                .range([buffer["height"], 0])
                .domain([buffer["minY"],buffer["maxY"]]);
        }
    }
}


/*Questa funzione si occupa di ridisegnare il grafico da capo. Viene sempre chiamata
in "newFrame" a seguito di un cambio di dimensioni, ma viene chiamata anche in altre
situazioni.*/
function reDraw(){
    //Per prima cosa ci si assicura che il vecchio grafico sia stato eliminato
    let svg = d3.select("svg");
    if (svg!=null)
        for (s of svg)
            s.remove();
    /*Nel div "graphicArea" viene creato un nuovo tag svg il cui nome è il tipo del grafico
    ("Linea", "Istogramma" o "Scatterplot"). Le sue dimensioni sono basate su larghezza
    e altezza determinate da newFrame.*/
    buffer["svg"] = d3.select("#graphicArea")
        .append("svg")
            .attr("id", tipoGrafico)
            .attr("xmlns","http://www.w3.org/2000/svg")
            .attr("width", buffer["width"] + marginGraph.left + marginGraph.right)
            .attr("height", buffer["height"] + marginGraph.top + marginGraph.bottom)
        .append("g")
            .attr("transform", "translate(" + marginGraph.left + "," + marginGraph.top + ")")
    //Se il grafico è di tipo "Linea"..
    if (tipoGrafico=="Linea"){
        /*Il nome della variabile X viene affisso all'asse X come label*/
        let labelAsseX = document.getElementById("VariabileX1").value;
        buffer["svg"].append("text")
            .attr("x", Math.floor(buffer["width"]/2) - Math.floor(labelAsseX.length/2))
            .attr("y", buffer["height"] + 36)
            .style("text-anchor", "middle")
            .text(labelAsseX);
        /*Viene poi invocato il metodo "nuoveLinee" per aggiungere all'svg creato inizialmente
        le linee del grafico */
        nuoveLinee();
        //Viene infine attivata la funzionalità di zoom
        abilitaZoom();
        /*Se la variabile "zoomedMinX" è in uso significa che il grafico disegnato rappresenta una porzione
        zoomata di un grafico iniziale. Cursore e descrizione vengono quindi aggiornati*/
        if (buffer["zoomedMinX"]!=null){
            let ga = document.getElementById("graphicArea");
            ga.style.cursor = "zoom-out";
            ga.title = "Fai click con il tasto destro per tornare alle dimensioni originali";
        }
    }
    //Se il grafico è di tipo "Scatterplot"..
    else if (tipoGrafico=="Scatterplot"){
        //Vengono disegnati nuovi punti sul grafico tramite la funzione "nuoviDot"
        nuoviDot(buffer["svg"], buffer["x"], buffer["y"], buffer["dataX"], (buffer["dataY"])[0]);
        //Viene abilitato lo zoom
        abilitaZoom();
        /*Se la variabile "zoomedMinX" è in uso significa che il grafico disegnato rappresenta una porzione
        zoomata di un grafico iniziale. Cursore e descrizione vengono quindi aggiornati*/
        if (buffer["zoomedMinX"]!=null){
            let ga = document.getElementById("graphicArea");
            ga.style.cursor = "zoom-out";
            ga.title = "Fai click con il tasto destro per tornare alle dimensioni originali";
        }
    }
    //Se il grafico è di tipo "Istogramma"
    else if (tipoGrafico=="Istogramma"){
        //Vengono disegnati i rettangoli dell'istogramma tramite il metodo nuoviRettangoli
        nuoviRettangoli(buffer["svg"], buffer["x"], buffer["dataX"]);
        /*La funzionalità di zoom non è prevista per l'istogramma, quindi vengono disattivati
        sia l'eventuale listener attivo sul div "graphicArea" sia l'aspetto del cursore*/
        let ga = document.getElementById("graphicArea");
        ga.style.cursor = "default";
        ga.title = "";
        ga.onmousedown = ()=>{};
    }
    //Vengono infine aggiunti gli assi al grafico..
    buffer["svg"].append("g")
            .attr("transform", "translate(0," + buffer["height"] + ")")
            .attr("id", "xAxis")
            .call(d3.axisBottom(buffer["x"]))
    buffer["svg"].append("g")
            .attr("id", "yAxis")
            .call(d3.axisLeft(buffer["y"]));
    //..e viene invocata una funzione ad hoc per correggere un bug grafico di Electron
    correggiErroreScalaElectron();
}

/*Questa funzione è stata creata con il preciso scopo di correggere un bug grafico
di Electron per il quale il segno "-" sulla scala degli assi per qualche motivo non
viene mai mostrato. Al suo posto compare misteriosamente una stringa di 3 caratteri senza senso*/
function correggiErroreScalaElectron(){
    //I caratteri buggati vengono sostituiti con il segno "-" in tutti gli elementi di tipo "tick"
    let d = document.getElementsByClassName("tick");
    for (n of d)
        n.lastChild.innerHTML = n.lastChild.innerHTML.replaceAll(String.fromCharCode(226,710,8217), "-");
}

/*Questa funzione procede a cambiare i dati associati all'asse X nel buffer generale. Viene
normalmente innescata quando l'utente seleziona una nuova variabile tramie il menù a tendina
"asse X" della pulsantiera*/
function aggiornaDatiX(){
    //Il nome della variabile scelta viene estratto dal menù a tendina
    let nomeX = document.getElementById("VariabileX1").value;
    /*Nel buffer generale vengono messi come dati per l'asse X i dati associati alla variabile
    scelta in "informazioni"*/
    buffer["dataX"] = informazioni.map(function(d){return d[nomeX]});
    /*Nel buffer generale vengono anche aggiornati minimo e massimo associati all'asse X*/
    buffer["minX"] = d3.min(buffer["dataX"]);
    buffer["maxX"] = d3.max(buffer["dataX"]);
    //Viene quindi creato un nuovo asse X con i nuovi estremi
    aggiornaAsse("x");
}


/*Questa funzione si fa carico del cambiare un array specifico di dati tra quelli associati
ai dati dell'asseY nel buffer generale. Viene normalmente innescata quando l'utente sceglie
una nuova variabile tramite uno dei menù a tendina associati alle variabili dell'asseY nella
pulsantiera principale. In caso di grafico di tipo "Linea" possono esistere più variabili
per l'asse Y, ragion per cui la funzione accetta in input un parametro "count" che si usa
per specificare di quale linea stiamo cambiando i dati di input.*/
function aggiornaDatiY(count){
    //Il nome della variabile da aggiornare viene estratto dal menù a tendina corrispondente
    let nomeT = document.getElementById(`VariabileY${count}`).value;
    /*Nel buffer generale viene aggiornato l'array associato a quella variabile. La proprietà
    "dataY" del buffer generale è in questo senso un array di array il cui numero di elementi
    riflette il numero di linee esistenti. Se ad esempio il numero linee è impostato a 2 ci
    saranno 2 array (e si accederà a quello giusto tramite "count - 1", con il -1 che costituisce
    una correzione legata al fatto che la prima cella dell'array ha come posizione "0" invece di "1")*/
    (buffer["dataY"])[count-1] = informazioni.map(function(d){return d[nomeT]});
}

/*Questa funzione si fa carico del ricalcolo degli estremi dell'asse Y e della creazione
di un nuovo asse Y aggiornato. Viene normalmente invocata dopo che sono stati aggiornati
uno o più array in buffer["dataY"].*/
function ricalcoloEstremiY(){
    //Minimo e massimo vengono resettati a un valore di default
    buffer["minY"] = 0;
    buffer["maxY"] = 0;
    /*Minimo e massimo vengono ricalcolati guardando a tutti gli array di dati
    contenuti in buffer["dataY"]*/
    for (el of buffer["dataY"]){
        buffer["minY"] = d3.min([buffer["minY"], d3.min(el)]);
        buffer["maxY"] = d3.max([buffer["maxY"], d3.max(el)]);
    }
    /*Eventuali zoom vengono resettati (giacché si suppone che se l'utente ha
    scelto una nuova variabile da studiare esso preferisca per prima cosa
    rivedere il grafico alle sue dimensioni originali*/
    buffer["zoomedMinX"] = null;
    buffer["zoomedMinY"] = null;
    buffer["zoomedMaxX"] = null;
    buffer["zoomedMaxY"] = null;
    //L'asse Y viene aggiornato con i nuovi estremi
    aggiornaAsse("y");
}

/*Questa funzione viene invocata quando bisogna creare un grafico per la prima volta.
Essa viene normalmente innescata quando il menù a tendina "tipoGrafico" cambia valore e
procede a inizializzare il buffer generale e a caricarvi i primi dati.*/
function inizializzaDati(){
    //Se il grafico è di tipo "Linea"..
    if (tipoGrafico=="Linea"){
        let numeroLinee = document.getElementById("numeroLinee").value;
        //buffer["dataY"] viene inizializzato come array vuoto
        buffer["dataY"] = [];
        let count = 1;
        //In ogni posizione dell'array viene messo un array di dati corrispondente a una variabile
        while (count<=numeroLinee){
            aggiornaDatiY(count);
            count = count + 1;
        }
        /*Vengono poi caricati nel buffer i dati relativi all'asse X
        (la funzione procede anche a disegnare l'asse X) */
        aggiornaDatiX();
        /*Vengono infine calcolati gli estremi dell'asse Y 
        (la funzione procede anche a disegnare l'asse Y)*/
        ricalcoloEstremiY();
    }
    //Se il grafico è di tipo "Scatterplot"..
    else if (tipoGrafico=="Scatterplot"){
        /*Vengono caricati nel buffer i dati relativi all'asse X
        (la funzione procede anche a disegnare l'asse X) */
        aggiornaDatiX();
        //buffer["dataY"] viene resettato all'array vuoto
        buffer["dataY"] = [];
        //Vengono caricati (relativamente all'asse Y) i dati dell'unica variabile permessa
        aggiornaDatiY(1);
        /*Vengono infine calcolati gli estremi dell'asse Y 
        (la funzione procede anche a disegnare l'asse Y)*/
        ricalcoloEstremiY();
    }
    //Se il grafico è di tipo "Istogramma"..
    else if (tipoGrafico=="Istogramma"){
        /*Vengono caricati nel buffer i dati relativi all'asse X
        (la funzione procede anche a disegnare l'asse X) */
        aggiornaDatiX();
        //buffer["dataY"] viene resettato all'array vuoto
        buffer["dataY"] = [];
        aggiornaDatiX();
        /*Eventuali zoom rimasti da grafici precedenti vengono resettati*/
        buffer["zoomedMinX"] = null;
        buffer["zoomedMinY"] = null;
        buffer["zoomedMaxX"] = null;
        buffer["zoomedMaxY"] = null;
        //Il minimo per l'asse Y viene inizializzato a 0
        buffer["minY"] = 0;
    }
}

/*Questa funzione si occupa di estrarre un sotto-campione dai dati di partenza
qualora il numero di punti da visualizzare in un grafico di tipo "Linea" o "Scatterplot"
ecceda il massimo limite consentito. Accetta come input un parametro "dati" che costituisce
un array di array (che idealmente sono due: uno per l'asse X e uno per l'asse Y, in modo
da lavorare ogni volta su una coppia (x,y) rappresentante un singolo punto)*/
function estraiSottocampione(dati){
    //Se il numero di punti rientra nel limite, i dati vengono restituiti inalterati
    if (dati[0].length <= capPuntiVisibili)
        return dati;
    else{
        /*Il risultato da restituire viene inizializzato come array di N array vuoti (con
        N il numero di array presenti nel parametro passato in input)*/
        let dati_sampled = new Array(dati.length);
        let iterazione = 0;
        while (iterazione<dati.length){
            dati_sampled[iterazione] = [];
            iterazione = iterazione + 1;
        }
        /*Durante il campionamento verrà copiata una generica coppia (x,y) ogni volta che
        se ne saranno saltate un certo numero (che verranno quindi scartate). Ogni quanto
        avviene la copia dipende dalla proporzione tra i punti in eccesso e il massimo consentito*/
        let ogniQuantoCopiare = Math.floor((dati[0].length - capPuntiVisibili) / capPuntiVisibili) + 1;
        /*Nella migliore delle ipotesi viene copiata una coppia ogni due (non si può accettare 1
        come valore per un'operazione modulo perché non avrebbe senso)*/
        if (ogniQuantoCopiare==1)
            ogniQuantoCopiare = 2;
        iterazione = 0;
        let colonnaDati = 0;
        while (iterazione<dati[0].length){
            //Tramite l'operazione modulo viene gestita l'alternanza tra il copiare e il non-copiare
            if (iterazione%ogniQuantoCopiare==0){
                colonnaDati = 0;
                //Se viene copiata una riga, vengono copiati i valori di tutte le colonne su quella riga
                while (colonnaDati<dati.length){
                    dati_sampled[colonnaDati].push((dati[colonnaDati])[iterazione]);
                    colonnaDati = colonnaDati + 1;
                }
            }
            iterazione = iterazione + 1;
        }
        return dati_sampled;
    }
}

/*Questa funzione si fa carico di disegnare i punti di un grafico di tipo Scatterplot.
Accetta come input un riferimento all'svg in cui disegnare il grafico, due riferimenti
agli assi x e y e due riferimenti ai dati da usare rispettivamente per le coordinate X e Y*/
function nuoviDot(svg, x, y, xDataSet, yDataSet){
    /*I dati vanno riformattati perché un grafico di tipo scatterplot 
    richiede un unico array di oggetti del tipo (x,y)*/
    let xy_data = [];
    /*Vogliamo anche escludere qualsiasi coppia non rientri nei limiti di scala
    stabiliti dai due assi (questa cosa succede qualora l'utente abbia effettuato
    uno zoom su una porzione di grafico, nel qual caso alcuni punti cadono fuori)*/
    let soglieX = x.domain();
    let soglieY = y.domain();
    let iterazione = 0;
    while (iterazione<xDataSet.length){
        if ( xDataSet[iterazione]<=soglieX[1] && xDataSet[iterazione] >= soglieX[0] && yDataSet[iterazione] <= soglieY[1] && yDataSet[iterazione] >= soglieY[0]){
            //Nei dati con cui disegnare vengono messi solo i punti che cadono entro i limiti
            xy_data.push({
                valoreX1 : xDataSet[iterazione],
                valoreY1 : yDataSet[iterazione]
            });
        }
        iterazione = iterazione + 1;
    }
    /*Prima di disegnare va comunque fatto un sottocampionamento (così da ridurre
    i punti qualora fossero troppi)*/
    let xy_data_sampled = (estraiSottocampione([xy_data]))[0];
    //Si disegnano infine i punti
    svg.append('g')
        .selectAll("dot")
        .data(xy_data_sampled)
        .enter()
        .append("circle")
            .attr("cx", function (d) { return x(d.valoreX1); } )
            .attr("cy", function (d) { return y(d.valoreY1); } )
            .attr("r", 1.5)
        .style("fill", colori[0]["acceso"]);
}

/*Questa funzione si fa carico di disegnare i rettangoli in un grafico di tipo "Istogramma"*/
function nuoviRettangoli(svg, x, xDataSet){
    /*Per prima cosa viene determinato il numero di classi
    da usare per disegnare l'istogramma.*/
    let bins = document.getElementById("valoreClassi").value;
    /*Gli estremi degli intervalli vengono determinati dividendo la scala
    dell'asse X per il numero di classi scelto*/
    let thresh = [];
    let count = 1;
    let valore = buffer["minX"];
    let aumento = (buffer["maxX"] - buffer["minX"])/bins;
    while (count<bins){
        valore = valore + aumento;
        thresh.push(valore);
        count = count + 1;
    }
    //L'istogramma viene creato a partire dai dati della variabile "asseX"
    let histogramBuilder = d3.histogram()
        .domain(x.domain())
        .thresholds(thresh);
    let histogram = histogramBuilder(xDataSet);
    /*Sull'asseY vengono invece riportate le frequenze assolute associate
    a ogni classe, perciò la scala dell'asse Y viene aggiustata di conseguenza*/
    buffer["maxY"] = d3.max(histogram, function(a) {return a.length});
    aggiornaAsse("y");
    //Vengono infine disegnati i rettangoli di ogni classe
    svg.selectAll("rect")
        .data(histogram)
        .enter()
        .append("rect")
        .attr("x", 1)
        .attr("transform", function(d) {return "translate(" + x(d.x0) + "," + buffer["y"](d.length) + ")";})
        .attr("width", function(d) {return (x(d.x1) - x(d.x0) - 1)>0 ? x(d.x1) - x(d.x0) - 1 : 1;})
        .attr("height", function(d) {return buffer["height"] - buffer["y"](d.length);})
        .style("fill", colori[0]["acceso"]);
}

/*Questa funzione si fa carico di innescare la chiamata per chiedere al back end il calcolo
delle medie mobili. Al termine dell'operazione il grafico viene sempre ridisegnato 
automaticamente (o dalla funzione che si occupa di raccogliere i risultati del back end 
oppure da questa stessa funzione qualora le medie mobili risultassero non attive (valore 
slider impostato a 1)). La funzione accetta come parametro un "intervallo" che specifica
quali medie mobili vanno ricalcolate nel formato [indiceInizio, indiceFine]. Se indiceInizio
e indiceFine sono entrambi impostati a -1 vuol dire che il ricalcolo riguarda tutti i dati
(cosa che si verifica se l'utente cambia la dimensione della finestra delle medie mobili)*/
function preparaMedieMobili(intervallo){
    /*Per prima cosa viene determinata la dimensione della finestra per le medie mobili.*/
    let smoothness = document.getElementById("valoreSmoothness");
    //Se la finestra ha un valore diverso da 1 l'opzione medie mobili è attiva e va chiesto il calcolo
    if (smoothness.value != 1){
        smoothness.setAttribute("indiceInizio",intervallo[0]);
        smoothness.setAttribute("indiceFine",intervallo[1]);
        let tipoCalcolo = {
                calcolo:"mediaMobile",
                window_size: smoothness.value
            };
        //Viene preparato l'array da passare al back end come input per il calcolo
        let inputPython = [];
        if (intervallo[0]!=-1){
            let posizioneIniziale = intervallo[0]-1;
            let posizioneFinale = intervallo[1]-1;
            while (posizioneIniziale<=posizioneFinale){
                /*Nell'array vengono copiati tutti gli array di dati dell'asse Y che vanno
                dall'indiceInizio all'indiceFine*/
                inputPython.push((buffer["dataY"])[posizioneIniziale]);
                posizioneIniziale = posizioneIniziale + 1;
            }
        }
        else
            /*Se indiceInizio e indiceFine hanno come valore "-1" vengono copiati
            semplicemente tutti gli array di dati dell'asseY*/
            for (y of buffer["dataY"])
                inputPython.push(y);
        /*Viene infine avviata la chiamata al back end. Quando i dati forniti dal
        back end saranno stati recuperati, il grafico verrà ridisegnato automaticamente*/
        chiediDatiPython(tipoCalcolo,inputPython);
    }
    else
        /*Se lo slider delle medie mobili è impostato a 1, non c'è di fatto bisogno
        di alcun calcolo e si procede quindi a disegnare subito il grafico*/
        reDraw();
}

/*Questa funzione si occupa di disegnare una singola linea in un grafico di tipo "Linea".
Accetta come input un riferimento all'svg su cui disegnare, due riferimenti ai due assi X e Y,
due riferimenti alle coordinate X e Y di ogni punto, un contatore che identifica la singola
linea, una stringa che identifica il colore della linea e una stringa che può essere "Smooth"
oppure "" e distingue una generica linea dalla sua media mobile (sulla base della presenza
o meno di "Smooth" nel nome)*/
function disegnaLinea(svg, x, y, xDataSet, yDataSet, contatore, coloreLinea, smooth){
    /*I dati di input per X e Y vengono filtrati affinché includano solo punti che
    cadono all'interno dei massimi stabiliti dagli assi (alcuni punti vanno esclusi se
    l'utente ha fatto uno zoom su una porzione specifica del grafico)*/
    let x_data = [];
    let y_data = [];
    let soglieX = x.domain();
    let soglieY = y.domain();
    let iterazione = 0;
    while (iterazione<xDataSet.length){
        if ( xDataSet[iterazione]<=soglieX[1] && xDataSet[iterazione] >= soglieX[0] && yDataSet[iterazione] <= soglieY[1] && yDataSet[iterazione] >= soglieY[0]){
            x_data.push(xDataSet[iterazione]);
            y_data.push(yDataSet[iterazione]);
        }
        iterazione = iterazione + 1;
    }
    /*Dai dati viene poi estratto un sottocampione se il numero di punti da disegnare
    eccede il limite massimo consentito*/
    let xy_sample = estraiSottocampione([x_data, y_data]);
    x_data = xy_sample[0];
    y_data = xy_sample[1];
    //Viene quindi disegnata la linea sull'svg
    let line = d3.line()
        .x(function(d, i) {
            return x(d)
        })
        .y(function(d, i) {
            return y(y_data[i])
        });
    svg.append("path")
        .attr("id", "graficoVariabileY"+smooth+contatore)
        .attr("fill", "none")
        .attr("stroke", coloreLinea)
        .attr("stroke-width", 1.5)
        .attr("d", line(x_data));
    /*La nuova linea disegnata viene resa visibile o meno sulla base del valore riportato
    nell'entry corrispondente della legenda*/
    let v = document.getElementById("toggleVariabileY"+contatore).getAttribute("value");
    if (v=="Mostra"){
        document.getElementById("graficoVariabileY"+smooth+contatore).style.display="none";
    }
    else{
        document.getElementById("graficoVariabileY"+smooth+contatore).style.display="block";
    }
}

/*Questa funzione si fa carico di disegnare le linee in un grafico di tipo "Linea"*/
function nuoveLinee(){
    let count = 0;
    let smoothness = document.getElementById("valoreSmoothness").value;
    let numeroLinee = document.getElementById("numeroLinee").value;
    /*Per prima cosa vengono disegnate le linee normali. Il loro colore è la variante "opaco"
    a meno che le medie mobili non siano disattivate (finestra impostata a 1), nel qual caso
    il colore viene promosso ad "acceso"*/
    let variante = "opaco";
    if (smoothness==1)
        variante = "acceso";
    while (count<numeroLinee){
        disegnaLinea(buffer["svg"], buffer["x"], buffer["y"], buffer["dataX"], (buffer["dataY"])[count], count+1, (colori[(count%colori.length)])[variante], "");
        count = count + 1;
    }
    /*Se l'opzione per le medie mobili è attiva si passa poi a disegnare le medie mobili
    di ogni linea*/
    if (smoothness!=1){
        variante = "acceso";
        count = 0;
        /*Trattandosi di medie mobili l'insieme di dati dell'asseX deve essere leggermente
        accorciato*/ 
        let dataXcorretto = buffer["dataX"].map((x) => x);
        while (count<(smoothness-1)){
            dataXcorretto.shift();
            count = count + 1;
        }
        count = 0;
        while (count<numeroLinee){
            disegnaLinea(buffer["svg"], buffer["x"], buffer["y"], dataXcorretto, medieMobili[count], count+1, (colori[(count%colori.length)])[variante], "Smooth");
            count = count + 1;
        }
    }
}

/*Questa funzione si fa carico dell'abilitare le funzionalità di zoom usate nei grafici
di tipo "Linea" o "Scatterplot"*/
function abilitaZoom(){
    let grafico = document.getElementById("graphicArea");
    //Se l'utente fa un click prolungato sull'area grafica..
    grafico.onmousedown = (ev) => {
        var body = document.getElementById("body");
        //Viene attivata una classe per il body in modo da impedire la selezione erronea di testo evidenziato
        body.classList.add("noselect");
        /*Se l'utente trascina la selezione fuori dall'area grafica, questi listener
        del body assicurano che l'area grafica riceva comunque gli eventi*/
        body.onmouseup = (ev) => {
            grafico.onmouseup(ev);
        };
        body.onmousemove = (ev) => {
            grafico.onmousemove(ev);
        };
        //Vengono registrate le coordinate iniziali del click prolungato
        var coordIX = ev.clientX;
        var coordIY = ev.clientY;
        /*Viene reso visibile il rettangolo opaco che evidenzia l'area di zoom
        e gli vengono assegnate come coordinate di partenza quelle del click iniziale*/
        var dragRect = document.getElementById("rettangoloZoom");
        dragRect.hidden = 0;
        aggiornaRettangolo(dragRect, coordIX, coordIX, coordIY, coordIY);
        /*Le coordinate del click iniziale vengono anche tradotte nel sistema di riferimento
        definito dagli assi X e Y del grafico (sfruttando le coordinate del centro cartesiano
        salvate nel buffer generale). Le coordinate "aggiustate" non possono mai superare i limiti
        minimi e massimi degli assi (da 0 a buffer["width"]e buffer["height"] rispettivamente)*/
        var adjustedIX = Math.max(0, Math.min(buffer["width"], (coordIX - buffer["centroX"])));
        var adjustedIY = Math.max(0, Math.min(buffer["height"], (buffer["centroY"] - coordIY)));
        /*Viene attivato un listener che tiene traccia degli spostamenti del mouse (fintanto che
        il click continua), aggiornando continuamente la posizione "finale" della selezione
        registrata in ogni momento (e di conseguenza anche l'area che abbraccia il rettangolo)*/
        grafico.onmousemove = (ev) => {
            var coordMX = ev.clientX;
            var coordMY = ev.clientY;
            var adjustedMX = Math.max(0, Math.min(buffer["width"], (coordMX - buffer["centroX"])));
            var adjustedMY = Math.max(0, Math.min(buffer["height"], (buffer["centroY"] - coordMY)));
            aggiornaRettangolo(dragRect, coordIX, coordMX, coordIY, coordMY);
        };
        /*Viene infine attivato il listener che intercetta la fine della selezione, determinata
        dal fatto che l'utente lascia andare il click*/
        grafico.onmouseup = (ev) => {
            //Il rettangolo di selezione torna nascosto, e il body viene ripristinato al suo stato iniziale
            dragRect.hidden = 1;
            body.classList.remove("noselect");
            body.onmouseup = ()=>{};
            body.onmousemove = ()=>{};
            //Vengono rilevate le coordinate finali in cui l'utente ha lasciato andare il click
            let coordFX = ev.clientX;
            let coordFY = ev.clientY;
            /*Vengono disattivati i due listener secondari (rimane però attivo quello legato a 
            onmousedown, qualora l'utente volesse zoomare di nuovo)*/
            grafico.onmousemove = () => {};
            grafico.onmouseup = () => {};
            //Anche le coordinate finali vengono convertite al sistema di riferimento degli assi X e Y
            var adjustedFX = Math.max(0, Math.min(buffer["width"], (coordFX - buffer["centroX"])));
            var adjustedFY = Math.max(0, Math.min(buffer["height"], (buffer["centroY"] - coordFY)));
            //Se le coordinate iniziali e finali differiscono, viene innescato lo zoom
            if (adjustedFX !== adjustedIX && adjustedFY !== adjustedIY) {
                /*Le coordinate iniziali e finali vengono "mappate" sulla scala dell'asse X e Y rispettivamente,
                in modo da permettere di ottenere nuovi minimi e massimi che vengono salvati nella versione
                "zoomed" dei massimi e minimi conservati nel buffer generale. Nel caso dell'asse Y c'è un passaggio
                in più (ovvero la sottrazione delle coordinate a buffer["height"] perché l'asse Y cresce in direzione
                inversa rispetto al crescere delle coordinate Y dei click del mouse (nel senso che l'origine dell'asseY
                si trova in basso e non in alto a destra come nel caso di clientY))*/
                let nuoveX = [adjustedIX, adjustedFX].map(buffer["x"].invert).sort(function(a,b) {return a-b;});
                let nuoveY = [buffer["height"]-adjustedIY, buffer["height"]-adjustedFY].map(buffer["y"].invert).sort(function(a,b) {return a-b;});
                buffer["zoomedMinX"] = nuoveX[0];
                buffer["zoomedMaxX"] = nuoveX[1];
                buffer["zoomedMinY"] = nuoveY[0];
                buffer["zoomedMaxY"] = nuoveY[1];
                //Una volta determinati gli estremi dello zoom, vengono aggiornati gli assi e ridisegnato il grafico
                aggiornaAsse("x");
                aggiornaAsse("y");
                reDraw();
            }
            /*Il cursore e la descrizione del grafico vengono aggiornati per far capire all'utente che
            può ripristinare il grafico originale con il click destro del mouse*/
            grafico.style.cursor = "zoom-out";
            grafico.title = "Fai click con il tasto destro per tornare alle dimensioni originali";
            //Viene attivato un listener per il click destro che innesca il ripristino del grafico
            grafico.addEventListener("contextmenu", annullaZoom);
        };
    };
    /*Se la funzionalità di zoom è stata attivata, vengono cambiati cursore e descrizione
    per far capire all'utente che può zoomare trascinando un rettangolo di selezione*/
    grafico.style.cursor = "crosshair";
    grafico.title = "Trascina un rettangolo con il mouse per evidenziare l'area selezionata";
}

/*Questa funzione viene innescata quanto l'utente clicca con il tasto destro su un grafico
che è stato zoomato. Essa procede a ripristinarlo al suo stato originale*/
function annullaZoom(){
    //Viene eliminato il listener che ha innescato questa funzione
    document.getElementById("graphicArea").removeEventListener("contextmenu", annullaZoom);
    //Le informazioni sui minimi e massimi del grafico zoomato vengono eliminate
    buffer["zoomedMinX"] = null;
    buffer["zoomedMinY"] = null;
    buffer["zoomedMaxX"] = null;
    buffer["zoomedMaxY"] = null;
    //Vengono aggiornati gli assi e ridisegnato il grafico
    aggiornaAsse("x");
    aggiornaAsse("y");
    reDraw();
}

/*Questa funzione si fa carico di preparare il grafico al salvataggio. Accetta come input
un parametro che descrive il formato dell'immagine da salvare*/
function preparaSalvataggio(extension){
    /*Le dimensioni originali del grafico vengono salvate in due variabili che verranno
    restituite dalla funzione come output alla fine delle operazioni*/
    let originalWidth = buffer["width"];
    let originalHeight = buffer["height"];
    //Viene attivata l'animazione "loading"
    attivaAnimazioneLoading();
    //Il tasto full screen viene nascosto perché non ha senso mostrarlo nell'immagine salvata
    document.getElementById("tastoFullScreen").style.display = "none";
    /*Il grafico viene ridisegnato regolando altezza e larghezza al massimo
    valore possibile in relazione alla dimensione dello schermo della macchina su cui
    è in esecuzione l'app (questo ha lo scopo di creare un'immagine "grande" che non richieda
    però l'uso della barra per scorrerla in orizzontale/verticale)*/
    buffer["width"] = screen.width - marginGraph.left - marginGraph.right - 16;
    buffer["height"] = screen.height - marginGraph.top - marginGraph.bottom - 16;
    /*Se l'immagine è in formato svg l'altezza viene leggermente ridotta perché si 
    suppone che l'utente potrebbe visualizzarla usando un web browser, i quali tipicamente
    riservano parte dell'altezza per la barra di navigazione in alto.*/
    if (extension=="svg")
        buffer["height"] = buffer["height"] - 130;
    //Il grafico viene cancellato e ridisegnato nelle nuove dimensioni
    let svg = d3.select("svg");
    if (svg!=null)
        for (s of svg)
            s.remove();
    aggiornaAsse("x");
    aggiornaAsse("y");
    reDraw();
    /*Se l'estensione è di tipo svg nel file verrà salvato proprio l'html contenuto nel tag
    svg che ospita il grafico. Sfortunatamente questo non include la legenda, ragion per cui
    ne va aggiunta una creata "a mano" all'ultimo momento*/
    if (extension=="svg"){
        if (tipoGrafico=="Linea"){
            let countTotale = 1;
            let countRiga = 1;
            let nl = parseInt((document.getElementById("numeroLinee").value));
            let posizioneX;
            //La prima riga della legenda ha altezza -10
            let posizioneY = -10;
            //La prima posizione in cui parte la scrittura in ogni riga è sempre 0
            let pixelRiga = 0;
            //Questa variabile tiene traccia del numero di entry da aggiungere alla legenda
            let entryDaAggiungere = 0;
            //Le operazioni proseguono finché il numero di entry esaminate coincide con il numero di linee esistenti
            while (countTotale<=nl){
                //Se una linea era stata nascosta dall'utente la si ignora (non verrà visualizzata nella legenda)
                let visibility = document.getElementById("toggleVariabileY"+countTotale).getAttribute("value");
                if (visibility=="Mostra")
                    countTotale = countTotale + 1;
                else{
                    /*Se una linea non è nascosta, si calcola quanto spazio in pixel 
                    richiede la sua entry nella nuova legenda e lo si aggiunge al totale 
                    di pixel occupati dalla riga corrente */
                    let prossimoAumento = 10 + document.getElementById("VariabileY"+countTotale).value.length*4 + 20;
                    //Questo però solo se l'aggiunta del prossimo aumento al numero di pixel occupati non porta a sforare
                    if (pixelRiga + prossimoAumento < screen.width-50){
                        pixelRiga = pixelRiga + prossimoAumento;
                        countTotale = countTotale + 1;
                        entryDaAggiungere = entryDaAggiungere + 1;
                    }
                    //Se si sfora, si mettono le entry esaminate fino a questo punto nella linea corrente e poi si riparte dalla linea successiva
                    else{
                        let scarto = Math.floor((screen.width-pixelRiga) / (entryDaAggiungere+1));
                        posizioneX = scarto;
                        while(countRiga<=countTotale){
                            if (document.getElementById("toggleVariabileY"+countRiga).getAttribute("value")!="Mostra"){
                                //Ogni entry è costituita da un pallino del colore della linea seguito dal nome della linea
                                let text = document.getElementById("VariabileY"+countRiga).value;
                                buffer["svg"].append("circle").attr("cx",posizioneX).attr("cy",posizioneY).attr("r", 6).style("fill", (colori[countRiga-1])["acceso"]);
                                posizioneX = posizioneX + 10;
                                buffer["svg"].append("text").attr("x", posizioneX).attr("y", posizioneY).text(text).style("font-size", "10px").attr("alignment-baseline","middle");
                                posizioneX = posizioneX + text.length*4 + 20;
                                posizioneX = posizioneX + scarto;
                            }
                            countRiga = countRiga + 1;
                        }
                        pixelRiga = prossimoAumento;
                        entryDaAggiungere = 1;
                        posizioneY = posizioneY + 15;
                        countTotale = countTotale + 1;
                    }
                }
            }
            /*Una volta usciti dal ciclo principale viene comunque lanciato un ciclo
            di scrittura per poter scrivere eventuali entry il cui costo in pixel è stato 
            calcolato ma che ancora non sono state scritte. Questo è necessario perché
            all'interno del ciclo principale la scrittura viene normalmente innescata
            solo quando si arriva effettivamente a sforare (cosa che ad esempio non succede
            mai se la legenda contiene poche entry e riesce quindi a entrare in una sola riga)*/
            let scarto = Math.floor((screen.width-pixelRiga) / (entryDaAggiungere+1));
            posizioneX = scarto;
            while(countRiga<countTotale){
                if (document.getElementById("toggleVariabileY"+countRiga).getAttribute("value")!="Mostra"){
                    let text = document.getElementById("VariabileY"+countRiga).value;
                    buffer["svg"].append("circle").attr("cx",posizioneX).attr("cy",posizioneY).attr("r", 6).style("fill", (colori[countRiga-1])["acceso"]);
                    posizioneX = posizioneX + 10;
                    buffer["svg"].append("text").attr("x", posizioneX).attr("y", posizioneY).text(text).style("font-size", "10px").attr("alignment-baseline","middle");
                    posizioneX = posizioneX + text.length*4 + 20;
                    posizioneX = posizioneX + scarto;
                }
                countRiga = countRiga + 1;
            }
        }
        else if (tipoGrafico=="Istogramma"){
            //Se il grafico è di tipo "Istogramma" la legenda è molto semplice ed è costituita da una sola entry
            let text = document.getElementById("VariabileX1").value;
            let posizioneX = Math.floor(screen.width/2)-(text.length*4 + 10)/2;
            buffer["svg"].append("circle").attr("cx",posizioneX).attr("cy", 0).attr("r", 6).style("fill", (colori[0])["acceso"]);
            posizioneX = posizioneX + 10;
            buffer["svg"].append("text").attr("x", posizioneX).attr("y", 0).text(text).style("font-size", "10px").attr("alignment-baseline","middle");
        }
        else if (tipoGrafico=="Scatterplot"){
            //Se il grafico è di tipo "Scatterplot" la legenda è molto semplice ed è costituita da una sola entry
            let vx = document.getElementById("VariabileX1").value;
            let vy = document.getElementById("VariabileY1").value;
            let text = "( "+vx+" , "+vy+" )";
            let posizioneX = Math.floor(screen.width/2)-(text.length*4 + 10)/2;
            buffer["svg"].append("circle").attr("cx",posizioneX).attr("cy", 0).attr("r", 6).style("fill", (colori[0])["acceso"]);
            posizioneX = posizioneX + 10;
            buffer["svg"].append("text").attr("x", posizioneX).attr("y", 0).text(text).style("font-size", "10px").attr("alignment-baseline","middle");
        }
    }
    return [originalWidth, originalHeight];
}

/*Questa funzione si fa carico di ripristinare il grafico una volta completato un salvataggio*/
function ripristinaDopoSalvataggio(originalWidth, originalHeight){
    //Le impostazioni di altezza e larghezza contenute nel buffer generale vengono ripristinate
    buffer["width"] = originalWidth;
    buffer["height"] = originalHeight;
    //Viene quindi creato un nuovo grafico fedele alle dimensioni originali
    newFrame();
    //Viene mostrato nuovamente il tasto full screen
    document.getElementById("tastoFullScreen").style.display = "block";
    //Viene disattivata l'animazione di loading
    disattivaAnimazioneLoading();
}

/*Questa funzione si occupa di aggiornare le dimensioni del rettangolo
usato per evidenziare l'area su cui effettuare lo zoom mano a mano che l'utente trascina
il mouse*/
function aggiornaRettangolo(rettangolo,x1,x2,y1,y2) {
    let x3 = Math.min(x1,x2);
    let x4 = Math.max(x1,x2);
    let y3 = Math.min(y1,y2);
    let y4 = Math.max(y1,y2);
    rettangolo.style.left = x3 + 'px';
    rettangolo.style.top = y3 + 'px';
    rettangolo.style.width = x4 - x3 + 'px';
    rettangolo.style.height = y4 - y3 + 'px';
}