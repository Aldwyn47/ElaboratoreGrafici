#Questo script python si fa carico di varie elaborazioni per conto delle finestre del front end
#Le finestre preparano i dati su cui fare i calcoli e li mettono in un opportuno file di input
#Questo script carica i dati dal file di input, esegue i calcoli e li scrive sul file di ouput
import sys
import numpy as np
import json

#PARAMETRI PASSATI DALL'ESTERNO:
#Identificatore della finestra che ha avviato la chiamata
identificatoreFinestra = sys.argv[1]
#Stringa che identifica il calcolo specifico da fare (al momento esiste solo la media mobile)
tipoCalcolo = json.loads(sys.argv[2])

#Buffer in cui vengono messi i dati letti dal file di input
dati = []
#Path del file di input (dipende direttamente dall'identificatore della finestra che ha fatto la chiamata)
pathFile = ".\\bridge\\" + str(identificatoreFinestra) + "From.txt"
#Path del file di output (dipende a sua volta dall'identificatore della finestra che ha fatto la chiamata)
pathOutput = ".\\bridge\\" + str(identificatoreFinestra) + "To.txt"
try:
    with open(pathFile, "r") as f:
        dati = json.loads(f.read())
    #buffer in cui vengono messi i risultati delle elaborazioni
    risultato = []
    if (tipoCalcolo["calcolo"]=="mediaMobile"): #calcolo della media mobile
        window_size = int(tipoCalcolo["window_size"])
        for arr in dati: #i dati di input possono contenere a seconda dei casi un solo array di valori o array multipli
            moving_average = []
            i = 0
            while i < len(arr) - window_size + 1:
                window_average = round(np.sum(arr[i:i+window_size]) / window_size, 2)
                moving_average.append(window_average)
                i += 1
            risultato.append(moving_average) #per ogni array di valori trovato nei dati di input, viene creato un corrispondente array per la media mobile nel risultato
    with open(pathOutput, "w") as f:
        json.dump(risultato,f)
except:
    with open(pathOutput, "w") as f: #in caso di errore viene scritto un messaggio di errore sul file di output
        f.write("erroreCalcoliPython")