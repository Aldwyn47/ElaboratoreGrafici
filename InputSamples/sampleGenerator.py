import random
import math

with open(".\\bridge\\Daje.txt", "a") as f:
    f.write("x\tsin(x)\tcos(x)\tx'\t-x'\n")
    i = 0;
    iterazioni = 200000;
    while (i<(math.pi*2)):
        f.write(str(i)+"\t"+str(math.sin(i)+(random.randrange(iterazioni/20)/(iterazioni/10)))+"\t"+str(math.cos(i)+(random.randrange(iterazioni/20)/(iterazioni/10)))+"\t"+str(i+(random.randrange(iterazioni/20)/(iterazioni/10)))+"\t"+str(-i-(random.randrange(iterazioni/20)/(iterazioni/10)))+"\n")
        i = i + (math.pi*2)/iterazioni;
    f.write(str(math.pi*2)+"\t"+str(math.sin(math.pi*2)+(random.randrange(iterazioni/20)/(iterazioni/10)))+"\t"+str(math.cos(math.pi*2)+(random.randrange(iterazioni/20)/(iterazioni/10)))+"\t"+str(i+(random.randrange(iterazioni/20)/(iterazioni/10)))+"\t"+str(-i-(random.randrange(iterazioni/20)/(iterazioni/10))))