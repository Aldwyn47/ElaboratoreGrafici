/*Questa funzione si fa carico del creare una nuova pulsantiera ogni volta
che viene cambiato il tipo di grafico mostrato*/
function creaPulsantiera(){
    //Per prima cosa viene aggiornato il valore della variabile globale che tiene traccia del tipo di grafico
    tipoGrafico = document.getElementById("tipoGrafico").value;
    //Viene anche resettata la legenda
    document.getElementById("wrapperLegenda").innerHTML = "";
    //Se il grafico è di tipo linea..
    if (tipoGrafico=="Linea"){
        //Viene iniettato un template html per la pulsantiera da usare per un grafico di tipo "Linea"
        document.getElementById("wrapperPulsantiera").innerHTML= `
            <div class="buttonWrapper" id="wrapperNumeroLinee">
                <span class="introBottoni" id="testoNumeroLinee">Numero Linee:</span>
                <select id="numeroLinee" class="bottonePremibile" title="Seleziona il numero di linee da mostrare nel grafico" precedente="1">
                </select>
            </div>
            <div class="buttonWrapper" title="Opzione per la media mobile">
                <div class="wrapperSlider" id="wrapperSliderLinea">
                    <span class="introBottoni" id="testoSmoothness">Smoothness:</span>
                    <input type="number" min="1" max="${capSmoothness}" class="valoreSlider" id="valoreSmoothness" value="1" precedente="1">
                </div>
                <input type="range" min="1" max="${capSmoothness}" value="1" class="slider" id="sliderSmoothness">
            </div>
            <div class="buttonWrapper" id="wrapperAsseX">
                <span class="introBottoni" id="testoAsseX">Asse X:</span>
                <select id="VariabileX1" class="bottonePremibile" title="Seleziona la variabile indipendente">
                </select>
            </div>
            <div class="buttonWrapper" id="wrapperAsseY">
                <div class="buttonWrapper" id="wrapperLinea1">
                    <span class="introBottoni" id="testoAsseY1">Linea 1:</span>
                    <select id="VariabileY1" class="bottonePremibile" title="Seleziona una variabile da studiare">
                    </select>
                </div>
            </div>
        `;
        //Il cap per la smoothness viene settato a 1/10 della lunghezza del data set su cui si lavora
        let nuovaSmoothness = Math.ceil(informazioni.length / 10);
        let vs = document.getElementById("valoreSmoothness");
        let ss = document.getElementById("sliderSmoothness");
        //Il cap smoothness così calcolato viene però usato solo se non supera una soglia limite predefinita
        if (nuovaSmoothness < capSmoothness){
            vs.setAttribute("max",nuovaSmoothness);
            ss.setAttribute("max",nuovaSmoothness);
        }
        /*Ogni volta che viene cambiata la smoothness (sia da slider che da input numerico)
        viene fatta una nuova richiesta per ricalcolare le medie mobili in toto. Viene anche
        fatto un controllo per riportare eventuali valori non validi all'interno del range
        valido*/
        ss.onchange = () => {
            copiaValore("sliderSmoothness","valoreSmoothness");
            aggiornaIconeLegenda();
            preparaMedieMobili([-1,-1]);
        };
        vs.onchange = () => {
            if (vs.value > parseInt(vs.getAttribute("max"))){
                vs.value = parseInt(vs.getAttribute("max"));
            }
            else if (vs.value < 1){
                vs.value = 1;
            }
            copiaValore("valoreSmoothness","sliderSmoothness");
            aggiornaIconeLegenda();
            preparaMedieMobili([-1,-1]);
        };
        /*La larghezza del tag di input numerico per la smoothness viene regolata in modo da
        poter contenere anche il massimo valore possibile per la smoothness*/
        vs.style.width = (Math.ceil(Math.log10(capSmoothness))+1)*13 + "px";
        let nl = document.getElementById("numeroLinee");
        //Viene inizializzato il menù a tendina per decidere il numero di linee da mostrare nel grafico
        for (i=1; i<=capNumeroLinee; i++){
            let o = document.createElement('option');
            o.innerHTML = i;
            nl.append(o);
        }
        //Vengono inizializzate le prime due variabili (una per l'asse X e una per l'asse Y)
        inizializzaMenuVariabile("VariabileX","1");
        inizializzaMenuVariabile("VariabileY","1");
        //Viene creata la prima entry nella legenda (per la singola variabile asse Y presente all'inizio)
        creaEntryLegenda("VariabileY",1);
        //Vengono attivate le funzionalità del menù a tendina con cui si sceglie il numero di linee da mostrare
        nl.onchange = aggiornaNumeroLinee;
        //le medie mobili vengono resettate
        medieMobili = null;
    }
    //Se grafico è di tipo Istogramma..
    else if (tipoGrafico=="Istogramma"){
        //Viene iniettato un template html per la pulsantiera da usare per un grafico di tipo "Istogramma"
        document.getElementById("wrapperPulsantiera").innerHTML= `
            <div class="buttonWrapper">
                <div class="wrapperSlider" id="wrapperSliderIstogramma">
                    <span class="introBottoni" id="numeroClassi">Numero Classi:</span>
                    <input type="number" min="1" max="${capBin}" class="valoreSlider" id="valoreClassi" value="1">
                </div>
                <input type="range" min="1" max="${capBin}" value="1" class="slider" id="sliderClassi" title="Seleziona il numero di classi per l'istogramma">
            </div>
            <div class="buttonWrapper" id="wrapperAsseX">
                <span class="introBottoni" id="testoAsseX">Variabile:</span>
                <select id="VariabileX1" class="bottonePremibile" title="Seleziona la variabile da studiare">
                </select>
            </div>
        `;
        //Viene inizializzato il menù per scegliere la singola variabile su cui si lavora
        inizializzaMenuVariabile("VariabileX","1");
        //Viene inizializzato lo slider con cui scegliere il numero di classi
        document.getElementById("sliderClassi").onchange = () => {
            copiaValore("sliderClassi","valoreClassi");
            reDraw();
        };
        /*Quando viene scelto un nuovo numero di classi si fa anche un controllo
        per riportare eventuali valori non validi all'interno del range valido*/
        let vc = document.getElementById("valoreClassi");
        vc.onchange = () => {
            if (vc.value > capBin){
                vc.value = capBin;
            }
            else if (vc.value < 1){
                vc.value = 1;
            }
            copiaValore("valoreClassi","sliderClassi");
            reDraw();
        };
        /*La dimensione del tag di input numerico per il numero di classi viene adattata
        in modo da poter contenere anche il massimo numero possibile di classi*/
        vc.style.width = (Math.ceil(Math.log10(capBin))+1)*13 + "px";
        //Viene infine creata una entry nella legenda per la singola variabile che si studia
        creaEntryLegenda("VariabileX",1);
    }
    //Se il grafico è di tipo Scatterplot..
    else if (tipoGrafico=="Scatterplot"){
        //Viene iniettato un template html per la pulsantiera da usare per un grafico di tipo "Scatterplot"
        document.getElementById("wrapperPulsantiera").innerHTML= `
            <div class="buttonWrapper" id="wrapperAsseX">
                <span class="introBottoni" id="testoAsseX">Asse X:</span>
                <select id="VariabileX1" class="bottonePremibile" title="Seleziona una variabile da studiare">
                </select>
            </div>
            <div class="buttonWrapper">
                <span class="introBottoni" id="testoAsseY">Asse Y:</span>
                <select id="VariabileY1" class="bottonePremibile" title="Seleziona una variabile da studiare">
                </select>
            </div>
        `;
        //Vengono inizializzato i menù per la variabile dell'asseX e la variabile dell'asseY
        inizializzaMenuVariabile("VariabileX","1");
        inizializzaMenuVariabile("VariabileY","1");
        /*Viene creata una entry nella legenda per la variabile dell'asse Y (in realtà questa
        entry contiene anche l'informazione relativa alla variabile dell'asse X) */
        creaEntryLegenda("VariabileY",1);
    }
    //Completata la creazione della pulsantiera del nuovo grafico vengono anche inizializzati i dati con cui disegnarlo
    inizializzaDati();
    //Viene quindi disegnato il nuovo grafico
    newFrame();
}

/*Questa funzione viene lanciata per inizializzare i tag select che si usano per scegliere
una variabile da studiare tra quelle disponibili nel data set*/
function caricaHeadersNelSelect(node){
    //Eventuali vecchie entry vengono rimosse
    while (node.firstChild)
        node.removeChild(node.firstChild);
    //Ogni singola entry del buffer headersRicevuti diventa un tag "option" per il tag "select"
    for (h of headersRicevuti){
            let opzione = document.createElement('option');
            opzione.innerHTML=h;
            node.append(opzione);
    }
}

/*Questa funzione viene usata negli slider e serve a copiare il valore dello
slider nel tag di input numerico (o viceversa)*/
function copiaValore(da, a){
    let daa = document.getElementById(da);
    let aa = document.getElementById(a);
    if (daa.value != aa.value)
        aa.value = daa.value;
}

/*Questa funzione si fa carico di inizializzare i menù a tendina (realizzati con tag select)
usati nella pulsantiera per selezionare le variabili del data set con cui lavorare. Accetta
come input una stringa che indica la natura della variabile (asse X o asse Y) e un contatore
(che in realtà serve solo per l'asse Y qualora fossero presenti più variabili)*/
function inizializzaMenuVariabile(variabile, count){
    let m = document.getElementById(variabile+count);
    //Il tag select viene riempito con option corrispondenti alle variabili del data set
    caricaHeadersNelSelect(m);
    /*Se la variabile è una variabile dell'asse Y vengono definiti alcuni comportamenti
    in caso venga selezionata una nuova variabile da studiare*/
    if (variabile!="VariabileX"){
        m.onchange = () => {
            /*Se il grafico è di tipo "Linea"*/
            if (tipoGrafico=="Linea"){
                //Viene aggiornato il nome della variabile nella legenda in alto
                document.getElementById("nome"+variabile+count).innerHTML = m.value;
                //Viene resettata l'opzione di visibilità per rendere visibile la nuova linea che verrà creata fra poco
                let v = document.getElementById("toggle" + variabile + count);
                v.style.opacity = "1";
                v.title = "Clicca per nascondere questa variabile";
                v.value = "Nascondi";
                document.getElementById("grafico" + variabile + count).style.display="block";
                //I valori associati a questa linea vengono cambiati per riflettere quelli della nuova variabile scelta
                aggiornaDatiY(count);
                //Viene effettuato il ricalcolo degli estremi dell'asse Y (con nuovi dati potrebbero essere cambiati)
                ricalcoloEstremiY();
                /*Nel buffer "medieMobili" vengono messi nuovi dati alla posizione associata alla variabile interessata,
                i quali riflettono la media mobile della nuova linea che verrà disegnata.*/
                preparaMedieMobili([count,count]);
                /*Non è necessario ridisegnare il grafico perché ciò accade automaticamente quando la finestra
                riceve i risultati del calcolo delle medie mobili*/
            }
            /*Se il grafico è di tipo scatterplot*/
            else if (tipoGrafico=="Scatterplot"){
                //Viene aggiornata la legenda in alto
                document.getElementById("nome"+variabile+count).innerHTML = "( " + document.getElementById("VariabileX1").value + " , " + m.value + " )";
                //Vengono aggiornati i dati dell'asseY con cui viene disegnato lo scatterplot
                aggiornaDatiY(count);
                //Vengono ricalcolati gli estremi dell'asse Y
                ricalcoloEstremiY();
                //Viene ridisegnato il grafico.
                reDraw();
            }
        };
    }
    /*Se la variabile è la variabile dell'asse X vengono definiti altri comportamenti*/
    else{
        m.onchange = () => {
            /*Se il grafico è di tipo "Istogramma" o "Scatterplot" viene aggiornata 
            la legenda in alto. Ciò non succede nel caso del grafico di tipo "Linea"
            perché in quel tipo di grafico la legenda conserva solo informazioni
            relative alle linee (mentre il nome della variabile dell'asseX viene direttamente
            allegato come label per l'asse)*/
            if (tipoGrafico=="Istogramma"){
                document.getElementById("nome"+variabile+count).innerHTML = m.value;
            }
            else if (tipoGrafico=="Scatterplot"){
                document.getElementById("nomeVariabileY1").innerHTML = "( " + document.getElementById("VariabileX1").value + " , " + document.getElementById("VariabileY1").value + " )";
            }
            //In qualsiasi caso vengono aggiornati i dati del grafico ed esso viene ridisegnato
            aggiornaDatiX();
            reDraw();
        };
    }
}

/*Questa funzione si occupa di creare una entry nella legenda in alto per una variabile
specifica. Accetta come parametri in input una stringa "variabile" che indica se
la variabile appartiene all'asseX o all'asseY e una stringa "count" usata per distinguere
tra loro eventuali variabili multiple dell'asseY*/
function creaEntryLegenda(variabile, count){
    let nuovaEntry = `
    <div class="rigaLegenda" id="toggle${variabile}${count}">
        <div class="elementLegenda">
            <img class="immagineLegenda" id="icona${variabile}${count}" src="assets/acceso${count}.png">
        </div>
        <div class="elementLegenda">
            <span id="nome${variabile}${count}"></span>
        </div>
    </div>
    `;
    //Un template html di base viene iniettato nel wrapper tramite insertAdjacentHTML
    document.getElementById("wrapperLegenda").insertAdjacentHTML("beforeend", nuovaEntry);
    //Sulla base del tipo di grafico il nome della variabile viene mostrato in modo leggermente diverso nella legendsìa
    if (tipoGrafico!="Scatterplot")
        document.getElementById("nome"+variabile+count).innerHTML = document.getElementById(variabile+count).value;
    else
        document.getElementById("nome"+variabile+count).innerHTML = "( " + document.getElementById("VariabileX1").value + " , " + document.getElementById(variabile+count).value + " )";
    /*Se il grafico è di tipo "Linea" viene anche attivata una funzionalità per la quale
    se l'utente clicca sulla entry della legenda la linea viene nascosta/mostrata*/
    if (tipoGrafico=="Linea"){
        let t = document.getElementById("toggle"+variabile+count);
        t.onclick = ()=> {toggle(count)};
        t.style.cursor = "pointer";
        t.setAttribute("value","Nascondi");
        t.title = "Clicca per nascondere questa variabile";
        /*Se sono attive le medie mobili, viene subito aggiornata l'iconcina della entry*/
        if (document.getElementById("valoreSmoothness").value!=1)
            document.getElementById("icona"+variabile+count).src = `assets/opaco${count}.png`;
    }
}

/*Questa funzione si occupa di cambiare gli asset grafici delle iconcine
della legenda quando il grafico passa dal non includere all'includere anche
le medie mobili (o viceversa). Tra di loro le varie icone hanno tutte lo stesso
nome salvo che per un "count" che identifica la variabile specifica a cui sono
associate. Per cambiarle tutte è quindi sufficiente un ciclo for su tutti i "count"
compresi in "numeroLinee" (ovvero il numero di linee esistenti)*/
function aggiornaIconeLegenda(){
    let smoothness = document.getElementById("valoreSmoothness").value;
    if (smoothness>1){
        let nl = document.getElementById("numeroLinee").value;
        let count = 1;
        while (count<=nl){
            document.getElementById("iconaVariabileY"+count).src=`assets/opaco${count}.png`;
            count = count + 1;
        }
    }
    else if (smoothness==1){
        let nl = document.getElementById("numeroLinee").value;
        let count = 1;
        while (count<=nl){
            document.getElementById("iconaVariabileY"+count).src=`assets/acceso${count}.png`;
            count = count + 1;
        }
    }
}

/*Questa funzione si occupa di nascondere o mostrare le varie linee nel grafico di tipo "Linea"
qunado l'utente clicca l'iconcina associata nella legenda. La funzione agisce relativamente
a un parametro "count" che permette di distinguere ogni linea dalle altre (inclusi tutti
i componenti associati, quali ad esempio l'iconcina nella legenda e la linea nel grafico*/
function toggle(count){
    let v = document.getElementById("toggleVariabileY" + count);
    let g = document.getElementById("graficoVariabileY" + count);
    let smooth = document.getElementById("valoreSmoothness").value;
    /*L'informazione relativa al se la linea sia visibile o meno risiede nell'attributo
    "value" dell'iconcina nella legenda'*/
    if (v.getAttribute("value")=="Nascondi"){
        g.style.display="none";
        v.setAttribute("value","Mostra");
        v.title = "Clicca per mostrare questa variabile";
        v.style.opacity = "0.6";
        if (smooth!=1) //Se la smoothness non è a 1 viene nascosta/mostrata anche la linea della media mobile
            document.getElementById("graficoVariabileYSmooth"+count).style.display="none";
    }
    else if (v.getAttribute("value")=="Mostra"){
        g.style.display="block";
        v.setAttribute("value","Nascondi");
        v.title = "Clicca per nascondere questa variabile";
        v.style.opacity = "1";
        if (smooth!=1)
            document.getElementById("graficoVariabileYSmooth"+count).style.display="block";
    }
}

/*Questa funzione entra in gioco in un grafico di tipo "Linea" quando l'utente
seleziona un numero diverso di linee da mostrare nel grafico. Essa procede
ad aggiornare sia la pulsantiera che la legenda espandendo o contraendo il numero
di entry associate alle singole linee*/
function aggiornaNumeroLinee(numeroPrecedente){
    let numeroLinee = document.getElementById("numeroLinee");
    let sogliaDaRaggiungere = numeroLinee.value;
    /*Ogni volta che il valore di numeroLinee cambia, viene anche salvato il valore precedente
    nell'attributo "precedente". Esso viene usato da questa funzione per fare un confronto
    tra il numero di linee esistenti e il numero di linee desiderato dall'utente.*/
    let lineeEsistenti = parseInt(numeroLinee.getAttribute("precedente"));
    //Se la differenza tra le due è maggiore di zero, dobbiamo creare nuove linee
    if (sogliaDaRaggiungere - lineeEsistenti > 0){
        let lineeCreate = lineeEsistenti + 1;
        //A ogni nuova linea che si procede a creare..
        while (lineeCreate<=sogliaDaRaggiungere){
            let nuovaVariabile = `
                <div class="buttonWrapper" id="wrapperLinea${lineeCreate}">
                    <span class="introBottoni" id="testoAsseY${lineeCreate}">Linea ${lineeCreate}:</span>
                    <select id="VariabileY${lineeCreate}" class="bottonePremibile" title="Seleziona una variabile da studiare">
                    </select>
                </div>
            `;
            //Viene iniettato un template html di base nella sezione asseY della pulsantiera
            document.getElementById("wrapperAsseY").insertAdjacentHTML("beforeend", nuovaVariabile);
            //Il template viene riempito e attivato
            inizializzaMenuVariabile("VariabileY",lineeCreate);
            //Viene creata una nuova entry nella legenda
            creaEntryLegenda("VariabileY",lineeCreate, "Linea");
            /*Per il grafico, vengono caricati i dati associati alla prima variabile 
            della lista (che viene selezionata automaticamente di default)*/
            aggiornaDatiY(lineeCreate);
            lineeCreate = lineeCreate + 1;
        }
        /*Finite di creare le entry vengono aggiornati i dati del grafico e viene chiesta
        la preparazione delle medie mobili per i nuovi dati (finita la preparazione verrà
        anche ridisegnato il grafico in automatico)*/
        ricalcoloEstremiY();
        preparaMedieMobili([lineeEsistenti+1,sogliaDaRaggiungere]);
    }
    //Se la differenza è negativa dobbiamo eliminare delle entry
    else if (sogliaDaRaggiungere - lineeEsistenti < 0){
        let asseY = document.getElementById("wrapperAsseY");
        let lineeCreate = lineeEsistenti;
        //Andando a scendere..
        while(lineeCreate>sogliaDaRaggiungere){
            //Viene eliminata l'ultima variabile dalla pulsantiera
            document.getElementById("wrapperLinea"+lineeCreate).remove();
            //Viene eliminata l'ultima entry dalla legenda
            document.getElementById("toggleVariabileY"+lineeCreate).remove();
            //Viene eliminato l'ultimo array dai dati del grafico relativi all'asseY
            buffer["dataY"].pop();
            lineeCreate = lineeCreate - 1;
        }
        //Terminata l'eliminazione delle linee vengono ricalcolati gli estremi dell'asseY e viene ridisegnato il grafico
        ricalcoloEstremiY();
        reDraw();
    }
    /*Terminato l'aggiornamento del numero di linee il nuovo numero di linee viene anche 
    salvato come valore "precedente" (verrà usato in caso di futuri aggiornamenti)*/
    numeroLinee.setAttribute("precedente", sogliaDaRaggiungere);
}