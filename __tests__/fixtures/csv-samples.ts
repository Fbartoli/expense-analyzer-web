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
