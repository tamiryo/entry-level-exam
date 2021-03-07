import express from 'express';
import bodyParser = require('body-parser');
import { tempData } from './temp-data';
import { serverAPIPort, APIPath } from '@fed-exam/config';

console.log('starting server', { serverAPIPort, APIPath });

const app = express();

const PAGE_SIZE = 20;

let ticketList = tempData;

const uniqId = () =>{
    return Math.random().toString(16).slice(2)+(new Date()).getTime()+Math.random().toString(16).slice(2);
}

app.use(bodyParser.json());

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

//get tickets
app.get(APIPath, (req, res) => {
    // @ts-ignore
    const page: number = req.query.page || 1;

    const paginatedData = ticketList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const withCustomProperties= paginatedData.map(item => item.pinned ? item : ({...item, pinned: false, status: 'Pending', seeMore: false}))

    res.send(withCustomProperties);
});


//clone ticket
app.post(APIPath, (req, res) => {
    try {
        const {ticket, index} = req.body;
        ticket.pinned = false;
        ticket.status = 'Pending';
        ticket.seeMore = false;
        ticket.id = uniqId();
        ticketList.splice(index, 0, ticket);
        res.status(201).send(ticket);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

//pin and unpin ticket
app.post(APIPath + '/pin', (req, res) => {
    try {
        const {ticket, operation, index} = req.body;
        if (operation === 'pin') {
            console.log("pin<", index)
            ticketList = ticketList.filter(current => current.id !== ticket.id);
            ticketList.unshift(ticket);
        } else {
            console.log('unpin', index)
            ticketList = ticketList.filter(current => current.id !== ticket.id);
            ticketList.splice(index, 0, ticket);
        }

        res.status(201).send('success');

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


//update ticket status
app.post(APIPath + '/status', (req, res) => {
    try {
        const {ticketId, status} = req.body;
        const ticket = ticketList.find(ticket => ticket.id === ticketId);
        ticket!.status = status;
        res.status(201).send(ticket);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

//get tickets - bonus search
app.get(APIPath + '/bsearch', (req, res) => {
    let tickets;
    // @ts-ignore
    const filter = req.query.searchVal[0];
    // @ts-ignore
    const key = req.query.searchVal[1];
    // @ts-ignore
    const val =  req.query.searchVal.length > 2 ? req.query.searchVal[2] : '';

    if(filter === 'before') {
        const date = key.slice(3,5) +'/' + key.slice(0,2) + '/' + key.slice(6);
        const convertedDate = new Date(date).getTime() / 1000;
        tickets = ticketList.filter(t => parseInt(t.creationTime.toString().slice(0,10)) < convertedDate && (t.title.toLowerCase() + t.content.toLowerCase()).includes(val));
        res.send(tickets);
    }
    if(filter === 'after') {
        const date = key.slice(3,5) +'/' + key.slice(0,2) + '/' + key.slice(6);
        const convertedDate = new Date(date).getTime() / 1000;
        tickets = ticketList.filter(t => parseInt(t.creationTime.toString().slice(0,10)) > convertedDate && (t.title.toLowerCase() + t.content.toLowerCase()).includes(val));
        res.send(tickets);
    }
    if(filter === 'from') {
        tickets = ticketList.filter(t =>  t.userEmail === key && (t.title.toLowerCase() + t.content.toLowerCase()).includes(val));
        res.send(tickets);
    }
});



app.listen(serverAPIPort);
console.log('server running', serverAPIPort)

