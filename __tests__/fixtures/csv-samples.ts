export const validCSVContent = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;Restaurant ABC;Restaurants;50.00;CHF;;CHF;50.00;;16.06.2024
123456;****1234;John Doe;16.06.2024;Grocery Store;Grocery stores;75.50;CHF;;CHF;75.50;;17.06.2024
123456;****1234;John Doe;17.06.2024;Gas Station;Gasoline service stations;60.00;CHF;;CHF;60.00;;18.06.2024`

export const csvWithTotals = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;Purchase 1;Restaurants;50.00;CHF;;CHF;50.00;;16.06.2024
Total;;;;;;;50.00;;;;;`

export const csvWithCommaDelimiter = `Account number,Card number,Account/Cardholder,Purchase date,Booking text,Sector,Amount,Original currency,Rate,Currency,Debit,Credit,Booked
123456,****1234,John Doe,15.06.2024,Test Purchase,Restaurants,50.00,CHF,,CHF,50.00,,16.06.2024`

export const csvWithSwissNumbers = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;Large Purchase;Shopping;1'234,56;CHF;;CHF;1'234,56;;16.06.2024`

export const csvWithIncome = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;01.06.2024;SALARY DEPOSIT;Other;5000.00;CHF;;CHF;;5000.00;02.06.2024
123456;****1234;John Doe;15.06.2024;Restaurant;Restaurants;50.00;CHF;;CHF;50.00;;16.06.2024`

export const csvWithEmptyDate = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;;Test Purchase;Restaurants;50.00;CHF;;CHF;50.00;;16.06.2024`

export const csvWithInvalidDate = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;invalid;Test Purchase;Restaurants;50.00;CHF;;CHF;50.00;;16.06.2024`

export const bankStatementCSV = `\uFEFFAccount number:;0293 00116636.40;
IBAN:;CH75 0029 3293 1166 3640 U;
From:;2026-01-05;
Until:;2026-02-06;
Opening balance:;;
Closing balance:;;
Valued in:;CHF;
Numbers of transactions in this period:;3;

Trade date;Trade time;Booking date;Value date;Currency;Debit;Credit;Individual amount;Balance;Transaction no.;Description1;Description2;Description3;Footnotes;
2026-02-06;12:27:27;;2026-02-06;CHF;-25.30;;;;9999037BN1227267;"ALDI SUISSE 83;ADLISWIL";"19950466-0 09/26; Debit card payment";Transaction no. 9999037BN1227267;;
2026-01-27;;2026-01-27;2026-01-27;CHF;;3000.00;;;0193027TQ0070534;"Iman Orynbekova;Moosstrasse 29; 8134 Adliswil; CH";e-banking credit;"Costs: Incoming payment UBS; Transaction no. 0193027TQ0070534";;
2026-01-24;16:00:15;2026-01-26;2026-01-24;CHF;-88.60;;;;9930526BN2765088;"Orell Fussli;8022 Zurich";"19950466-0 09/26; Debit card payment";Transaction no. 9930526BN2765088;;`
