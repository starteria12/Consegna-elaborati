const prompt=require("prompt-sync")(); // per usare prompt in node.js

//funzione per trovare il massimo comune divisore (MCD) utilizzando l'algoritmo di Euclide
function trovaMCD(nuero1, numero2) {
    //applicazione dell'algoritmo di Euclide
    while (numero2 !== 0) {
        let a=numero2;
        numero2 = nuero1 % numero2;
        nuero1 = a;
    }
    return nuero1;
}
//funzione principale per eseguire il programma
function caclolaMCD() {
    let primoNumero=prompt("Inserisci il primo numero: ");
    primoNumero=parseInt(primoNumero); //converte la stringa in un numero intero

    //verifica se l'input è  valido
    if (isNaN(primoNumero)) {
        console.log("Per favore, inserisci un numero valido.");
        return;
    }
    somma+=numero;
}

//chiama la funzione per calcolare il MCD
calcolaSomma();
-----------------------------------------------------------------------------------------------------------------


const prompt=require("prompt-sync")(); // per usare prompt in node.js

//funzione per calcolare la somma di una serie di  numeri 
function calcolaSomma() {
    HTMLDataListElement numeroDielementi = prompt("inserisci il numero di elementi per calcolare la somma: ");
    numeroDielementi = parseInt(numeroDielementi); //converte la stringa in un numero intero

    //verifica se l'input è valido
    if (isNaN(numeroDielementi) || numeroDielementi <= 0) {
        console.log("Per favore, inserisci un numero valido maggiore di zero.");
        return;
    }
    let somma = 0; //inizializza la somma a zero
    //loop per chiedere all'utente di inserire i numeri e calcolare la somma
    for (let i = 0; i < numeroDielementi; i++) {
        let numero = prompt(`Inserisci il numero ${i + 1}: `);
        numero = parseFloat(numero); //converte la stringa in un numero

        //verifica se l'input è valido
        if (isNaN(numero)) {
            console.log("Per favore, inserisci un numero valido.");
            return;
        }
        somma += numero; //aggiunge il numero alla somma
    }
    //mostra la somma totale
    console.log(`La somma totale è: ${somma}`);
}   
//chiamata alla funzione per calcolare la somma
calcolaSomma();
-------------------------------------------------------------------------------------------------------------------
//definire a funzione per convertire i gradi Celsius in Fahrenheit
function cToF(gradiCelsius) {
    //mettere l'input in una variabile
    var cTemp=gradiCelsius;
    //calcola l'equivalente in Fahrenheit
    var fTemp = (cTemp * 9/5) + 32;
    //crea un messaggio che descriva la conversione
    var message = cTemp + '\xB0C is ' cToFahr + '\xB0F.';
    //logga il messaggio nella console
    console.log(message);
}

//definire la funzione di converti da Fahrenheit a Celsius
function fToC(gradiFahrenheit) {
    //mettere l'input in una variabile
    var fTemp = gradiFahrenheit;
    //calcola l'equivalente in Celsius
    var cTemp = (fTemp - 32) * 5/9; 
    //crea un messaggio che descriva la conversione
    var message = fTemp + '\xB0F is ' + cTemp + '\xB0C.';
    //logga il messaggio nella console
    console.log(message);
}

//chiama la  funzione cToF con temperatura di 60 gradi Celsius
cToF(60);

//chiama la funzione fToC con temperatura di 45 gradi Fahrenheit
fToC(45);
------------------------------------------------------------------------------------------------------------------


//array[] con i giorni della settimana
const giorniSettimana = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
//dichiarazione variabili
var meleRimanenti = 5;
var i = 0;

while (meleRimanenti > 2) {
    let giorno = giorniSettimana[i % 7];
    console.log(giorno + " " + (i+1)); // Giorno della settimana e il numero
    console.log("Ho " + meleRimanenti + " mele"); //mele rimanenti

//se oggi e mercoledi
    if (giorno == "Mercoledì") {
        console.log("Oggi non ho voglia di mela"); //non mangio la mela
    } else { //altrimenti mangio la mela
        console.log("Mangio una mela");
        meleRimanenti--;//sottrae una mela dalle mele rimanenti
    }

    console.log("Mi rimangono " + meleRimanenti + " mele");//mostra le mele rimanenti
    console.log("------------------------");

    i++;
}
console.log("Da oggi non posso mangiare mele");
