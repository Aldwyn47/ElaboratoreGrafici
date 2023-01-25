#Questo script python si occupa di leggere un data set a partire da un file di input
#Una volta letti i dati, essi vengono convertiti in formato JSON e messi in un opportuno file di output
import pandas
import sys
import json

#PARAMETRI PASSATI DALL'ESTERNO:
#Identificatore della finestra che ha avviato la chiamata
identificatoreFinestra = sys.argv[1]
#Path del file di input da cui leggere i dati
path = sys.argv[2]

#Path del file di output su cui verrà scritto il risultato delle elaborazioni.
#Include l'identificatore della finestra che aveva richiesto le informazioni (che viene ricevuto dall'esterno)
pathFile = ".\\bridge\\" + str(identificatoreFinestra) + "To.txt"

#Dal path del file di input vengono estratti gli ultimi 3 caratteri (l'estensione)
splitpath = path.split(".")
extension = splitpath.pop(len(splitpath)-1)

#Buffer in cui parcheggiare temporaneamente i dati letti dal file di input
dati = []
try:
    #Caricamento dati in memoria
    if (extension=="txt"):
        dati = pandas.read_csv(path, sep="\t")
    elif (extension=="csv"):
        dati = pandas.read_csv(path)
    elif (extension in ["xls", "xlsx"]):
        dati = pandas.read_excel(path)
    #Se tutto va bene, i dati letti dal file di input vengono scritti in formato JSON sul file di output
    with open(pathFile, "w") as f:
        f.write(str(dati.to_json(orient='table')))
except:
    #In caso di errore viene scritto un messaggio di errore sul file di output
    with open(pathFile, "w") as f:
        f.write("erroreDataLoader")

            
