# ELABORATORE GRAFICI

## Introduzione _(Introduction)_

Questa applicazione è un prototipo sperimentale sviluppato dallo studente Andrea Imparato nell'ambito del tirocinio intracurriculare svolto presso RedLynx Robotics (della durata complessiva di 150 ore). Essa consiste in un software di elaborazioni grafiche che a partire da un file input di formato txt, csv, xls o xlsx è in grado di creare grafici di tipo Linea, Istogramma o Scatterplot basati sui dati estratti dal file analizzato.


_This application is an experimental prototype developed by student Andrea Imparato during his 150 hours internship at RedLynx Robotics. It consists in a data visualization software capable of creating line plots, scatter plots and histograms using data extracted from an input file (currently supported formats are txt, csv, xls and xlsx)._

## Installazione _(Installation)_

L'applicazione è basata primariamente sul modulo Electron di node.js ma sfrutta anche degli script python eseguiti in risposta a delle richieste inoltrate dall'utente tramite UI. Per poterla lanciare è quindi necessario installare sia node.js che python, oltre alle rispettive dipendenze.

Le dipendenze relative a node.js sono specificate nel file "package.json" e consistono nei seguenti moduli:

- @electron-forge/cli
- @electron-forge/maker-deb
- @electron-forge/maker-rpm
- @electron-forge/maker-squirrel
- @electron-forge/maker-zip
- electron
- fs

Le dipendenze relative a python sono specificate nel file "requirements.txt" incluso nella cartella "python" e consistono nei seguenti moduli:

- pandas
- openpyxl
- pyinstaller

Il modulo pyinstaller serve invero solo qualora si voglia anche impacchettare l'applicazione in un singolo eseguibile (vedi sezione successiva).

L'applicazione usa anche i moduli D3 e dom-to-image di node.js, ma essi sono già inclusi nel codice sorgente. Il modulo D3 è però in formato Zip, ragion per cui prima di procedere con l'installazione è necessario estrarne i file. Per farlo è sufficiente recarsi nella directory "\SourceCode\script\" e usare l'opzione "Estrai tutto" sul file "D3.zip". Supponendo che node.js e python siano già installati, per poter includere correttamente anche le rispettive dipendenze è sufficiente spostarsi nella directory "SourceCode" (quella che contiene tutto il codice sorgente, facilmente identificabile dalla presenza del file "package.json") e lanciare i seguenti comandi:

```bash
	npm install
	pip install -r ".\python\requirements.txt"
```

Il primo comando si occuperà di installare i moduli di node.js necessari (creando così la cartella "node-modules"), mentre il secondo installerà i moduli usati da python. Affinché sia possibile lanciare l'applicazione è però necessario che risulti installato anche Git sul sistema in uso dall'utente. Supponendo che Git sia presente (in caso contrario è sufficiente installarlo), l'applicazione può essere lanciata (sempre dalla cartella "SourceCode") tramite il comando:

```bash
	npm start
```


_This app is primarily based on the Electron module of node.js but also runs python scripts to fullfill certain user requests. As such, it requires the installation of both node.js and python (as well as their dependencies) prior to its first launch._

_Node.js related dependencies are specified in the "package.json" file and consist in the following modules:_

- _@electron-forge/cli_
- _@electron-forge/maker-deb_
- _@electron-forge/maker-rpm_
- _@electron-forge/maker-squirrel_
- _@electron-forge/maker-zip_
- _electron_
- _fs_

_Python related dependencies are specified in the "requirements.txt" file found in the "python" directory and consist in the following modules:_

- _pandas_
- _openpyxl_
- _pyinstaller_

_The pyinstaller module is actually only needed for application bundling (see section below)._

_The app effectively uses the D3 and dom-to-image node.js modules as well, but those are already included in the source code. The D3 module is however in .zip format, meaning it must be unzipped before proceeding with installation. In order to do so, use the "Extract All" option on the "D3.zip" file found in the "\SourceCode\script\" directory. Assuming both node.js and python are already installed, in order to correctly include the respective dependencies the following commands will suffice:_

```bash
	npm install
	pip install -r ".\python\requirements.txt"
```

_Both of them must be run only after changing the working directory to "SourceCode" (the one containing all the source code, easily recognizable by the presence of the "package.json" file). The first command takes care of installing the necessary node modules (thus creating the "node-modules" directory) while the secondo one installs the modules used by python. In order to launch the application it is also necessary for Git to be present on the user's system. Assuming the user already has Git (otherwise installing it will suffice), the app can be launched by running the following command from the "SourceCode" directory:_

```bash
	npm start
```

## Impacchettamento in un singolo eseguibile _(Application Bundling)_

Per impacchettare l'applicazione in un singolo eseguibile si può sfruttare electron-forge, ma prima di farlo è necessario convertire preventivamente a eseguibili anche gli script di python che vengono lanciati dal processo principale. Per prima cosa, si suppone che siano già stati seguiti tutti i passi illustrati al punto 2 (installazione), incluso quello che provvede ad aggiornare la directory corrente a "SourceCode". A quel punto, per poter creare un file .exe a partire dal codice sorgente vanno lanciati in ordine i seguenti comandi:

```bash
pyinstaller --distpath "./python" --specpath "./python" --workpath "./python/build" -F "./python/DataLoader.py"
pyinstaller --distpath "./python" --specpath "./python" --workpath "./python/build" -F "./python/DataProcessor.py"
npm run make
```

Una volta terminato, l'ultimo comando produrrà nella cartella del codice sorgente una cartella "out" che contiene al suo interno la cartella con l'applicazione impacchettata. Essa può essere spostata a piacimento fintanto che i file all'interno della cartella dell'applicazione non vengono separati. Per far partire l'applicazione sarà a quel punto sufficiente lanciare l'eseguibile .exe (trattandosi di un prototipo è necessario fornire i permessi di amministratore).


_The app can be bundled using electron-forge, but in order to do so it is first necessary to also bundle the two auxiliary python scripts. Assuming all steps described in section 2 (installation) were followed (also implying the working directory is already set to "SourceCode"), a .exe file can be created from the source code by running these commands in order:_

```bash
pyinstaller --distpath "./python" --specpath "./python" --workpath "./python/build" -F "./python/DataLoader.py"
pyinstaller --distpath "./python" --specpath "./python" --workpath "./python/build" -F "./python/DataProcessor.py"
npm run make
```

_Once the final command has finished, an "out" directory can be found within the source code's directory: the directory containing the bundled application resides inside it. This directory can be moved elsewhere as long as the files included inside it are never separated. The application can now be launched by running the .exe file found inside (must be run as administrator since it's still a prototype)._

## Bug noti _(Known bugs)_

- Il prototipo è al momento in grado di processare solo dati numerici e si comporta in modo imprevedibile in caso di input differenti.
- Nel caso dei grafici di tipo "Linea" è assente un meccanismo di interpolazione in grado di mostrare linee i cui punti
di inizio o fine giacciono fuori dal grafico. La conseguenza principale è che in caso di zoom potrebbero venir "cancellate" inavvertitamente alcune linee (o alcune porzioni di esse) sulla base della dimensione del rettangolo trascinato dall'utente.


- _The prototype is currently capable of processing exclusively numeric data. Input data of a different type will produce unpredictable effects._
- _"Linea" (Line plot) currently lacks an interpolation feature capable of showing lines that have either their starting or ending point outside the boundaries. The main consequence of this is that some lines (or at least a portion of them) might not be displayed correctly depending on how wide is the zoom rectangle dragged by the user._

## Funzionalità da sviluppare in futuro _(Features to add in future versions)_

Lista funzionalità:
- Possibilità di caricare più data set su cui lavorare nella stessa finestra
- Possibilità di mostrare più grafici nella stessa finestra
- Possibilità di eseguire operazioni sui dati prima di mostrarli (ad esempio calcolare e mostrare il rapporto tra una variabile e un'altra invece che le singole variabili individualmente)
- Meccanismi di validazione e/o conversione sui dati di input (ad esempio associare a una stringa che rappresenta una data
un valore numerico che permetta il suo trattamento)
- Interpolazione per il grafico di tipo "Linea"

_Features list:_
- _Loading multiple data sets in the same window_
- _Showing multiple plots in the same window_
- _Running operations on data before showing it (for example computing the ratio between two variables and showing the result instead of showing the two variables individually)_
- _Input validation/preprocessing (for example converting strings that represent a date to numeric values that can be properly processed)_
- _Interpolation for line plots_
