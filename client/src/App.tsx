import React from 'react';
import './App.scss';
import {createApiClient, Ticket} from './api';

export type AppState = {
    tickets?: Ticket[],
    ticketsStatus?: Ticket[],
    searchedTickets?:Ticket[],
    search: string;
    dark: boolean,
    backgroundColor: string,
    searchColor: string,
    resultColor: string,
    ticketColor: string,
    pinnedCount: number,
    pageNumber: number,
    hasMore: boolean,
    status: string,
    showMore: boolean
    scrollBlock: boolean
}

const api = createApiClient();

export class App extends React.PureComponent<{}, AppState> {

    state: AppState = {
        search: '',
        dark: false,
        backgroundColor: '#f5f9fc',
        searchColor: 'black',
        resultColor: '#7a92a5',
        ticketColor: '#20455e',
        pinnedCount: 0,
        pageNumber: 1,
        hasMore: true,
        status: 'All',
        showMore: false,
        scrollBlock: false
    }

    searchDebounce: any = null;

    Scroll = () => {
        setTimeout(async () => {
            if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight && this.state.hasMore && !this.state.scrollBlock) {
                const nextPage = await api.getTickets(this.state.pageNumber + 1);
                this.setState({
                    tickets: [...this.state.tickets!, ...nextPage],
                    pageNumber: this.state.pageNumber + 1,
                    hasMore: nextPage.length === 0 ? false : true
                })
            }
        }, 3000);

    }

    async componentDidMount() {
        const prevState = sessionStorage.getItem('state')
        const parsedState = prevState ? JSON.parse(prevState) : undefined
        if (parsedState) {
            this.setState({
                tickets: await api.getTickets(1),
                dark: parsedState.dark,
                backgroundColor: parsedState.backgroundColor,
                searchColor: parsedState.searchColor,
                resultColor: parsedState.resultColor,
                ticketColor: parsedState.ticketColor,
            })
            document.body.style.background = this.state.backgroundColor;
        } else {
            this.setState({
                tickets: await api.getTickets(1),
            });
        }
        if (parsedState && parsedState.pinnedCount > 0 && parsedState.pinnedCount !== this.state.pinnedCount) {
            console.log(parsedState.pinnedCount)
            this.setState({
                pinnedCount: parsedState.pinnedCount
            })
        }
        window.addEventListener('scroll', this.Scroll, true);

    }

    pinTicket = async (ticket: Ticket) => {
        if (!ticket.pinned) {
            ticket.pinned = true;
            await api.setPin(ticket, 'pin', this.state.pinnedCount + 1);
            await this.setState({
                tickets: [ticket, ...this.state.tickets!.filter(current => current.id !== ticket.id)],
                pinnedCount: this.state.pinnedCount + 1
            })
        } else {
            ticket.pinned = false;
            console.log(ticket)
            const filtered = this.state.tickets!.filter(current => current.id !== ticket.id);
            await api.setPin(ticket, 'unpin', this.state.pinnedCount - 1);
            await this.setState({
                    pinnedCount: this.state.pinnedCount - 1,
                },
                () => {
                    this.setState({
                        tickets: [...filtered.slice(0, this.state.pinnedCount), ticket, ...filtered.slice(this.state.pinnedCount)]
                    })
                }
            )
        }
        sessionStorage.setItem('state', JSON.stringify(this.state));
    };

    clone = async (ticket: Ticket) => {
        const clonedTicket = await api.clone(ticket, this.state.pinnedCount);
        console.log(clonedTicket)
        if (clonedTicket.creationTime === ticket.creationTime) {
            this.setState({
                tickets: [...this.state.tickets!.slice(0, this.state.pinnedCount), clonedTicket, ...this.state.tickets!.slice(this.state.pinnedCount)],
                hasMore: true
            })
        }
    };
    filterByEmail = (email: string) => {
        this.setState({
            scrollBlock: true
        })
        this.onSearch('from:' + email);
    }
    resetSearch = () => {
        this.setState({
            search: '',
            searchedTickets: undefined
        });
    }
    handleStatusChange = async (ticket: Ticket, event: any) => {
        console.log(event.target.value)
        const select = this.state.status;
        ticket.status = event.target.value;
        await api.updateStatus(ticket.id, event.target.value);
        this.setState({
            ticketsStatus: ['Pending', 'InProgress', 'Closed'].includes(select) ? this.state.tickets!.filter(ticket => ticket.status === select) : undefined
        })
        this.forceUpdate();
    }

    handleStatusFilter = (event: any) => {
        console.log(event.target.checked)
        this.setState({
            status: event.target.value,
            ticketsStatus: ['Pending', 'InProgress', 'Closed'].includes(event.target.value) ? this.state.tickets!.filter(ticket => ticket.status === event.target.value) : undefined
        })
    }

    seeMore = (ticket: Ticket) => {
        ticket.showMore = !ticket.showMore;
        this.forceUpdate();
    }

    renderTickets = (tickets: Ticket[]) => {
        console.log(tickets)
        const filteredTickets = tickets
            .filter((t) => (t.title.toLowerCase() + t.content.toLowerCase() + t.userEmail.toLowerCase()).includes(this.state.search.toLowerCase()));
        return (
            <div>
                <div className='results'
                     style={{color: this.state.resultColor}}>Showing {filteredTickets.length} results
                </div>
                <ul className='tickets'>
                    {filteredTickets.map((ticket, index) => (
                        <li key={index} className='ticket' style={{backgroundColor: this.state.backgroundColor}}>
                            <button className='right-button' onClick={() => this.pinTicket(ticket)}>
                                {ticket.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button className='right-button' onClick={() => this.clone(ticket)}>
                                Clone
                            </button>
                            <label style={{color: this.state.resultColor}}>
                                Status:
                                <select style={{margin: 5}} value={ticket.status}
                                        onChange={(e) => this.handleStatusChange(ticket, e)}>
                                    <option value='Pending'>Pending</option>
                                    <option value="InProgress">In Progress</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </label>
                            <h5 className='title' style={{color: this.state.ticketColor}}>{ticket.title}</h5>
                            <p style={{lineHeight: "20px", color: this.state.ticketColor}}
                               className={ticket.showMore ? "" : "hide-content"}>
                                {ticket.content}
                            </p>
                            <button className='show-button' onClick={() => this.seeMore(ticket)}>
                                {ticket.showMore ? 'See Less' : 'See More'}
                            </button>
                            <footer>
                                <div className='meta-data'
                                     style={{color: this.state.resultColor}}>By
                                    <button
                                        className='email-button'
                                        style={{color: this.state.resultColor}}
                                        onClick={() => this.filterByEmail(ticket.userEmail)}>{ticket.userEmail}</button> | {new Date(ticket.creationTime).toLocaleString()}
                                </div>
                            </footer>
                        </li>
                    ))}
                </ul>
            </div>);
    }

    onSearch = async (val: string, newPage?: number) => {
        let searchVal: any;
        if (val.slice(0, 7) === 'before:') {
            searchVal = (val.slice(7)).split(' ');
            searchVal = ['before', ...searchVal];
        }
        if (val.slice(0, 6) === 'after:') {
            searchVal = (val.slice(6)).split(' ');
            searchVal = ['after', ...searchVal];
        }
        if (val.slice(0, 5) === 'from:') {
            searchVal = (val.slice(5)).split(' ');
            searchVal = ['from', ...searchVal];
        }


        clearTimeout(this.searchDebounce);

        this.searchDebounce = setTimeout(async () => {
            searchVal ?
                this.setState({
                    searchedTickets: await api.bonusSearch(searchVal)
                })
                : this.setState({
                    search: val
                })
        }, 2000);//wait 2 seconds and then fire setState
    }

    darkMode = async () => {
        await this.setState({
            dark: !this.state.dark,
            backgroundColor: this.state.dark ? '#f5f9fc' : 'black',
            searchColor: this.state.dark ? 'black' : '#f5f9fc',
            resultColor: this.state.dark ? '#7a92a5' : 'white',
            ticketColor: this.state.dark ? '#20455e' : 'white'
        });
        document.body.style.background = this.state.backgroundColor;
        sessionStorage.setItem('state', JSON.stringify(this.state));
    }

    render() {
        console.log(this.state.search)
        const tickets = this.state.searchedTickets || this.state.ticketsStatus || this.state.tickets;
        return (
            <main onScroll={this.Scroll}>
                <button onClick={this.darkMode}>
                    {this.state.dark ? 'Light Mode' : 'Dark Mode'}
                </button>
                {this.state.search !== '' || this.state.searchedTickets ?
                    <button onClick={this.resetSearch}>
                        Reset Search Filter
                    </button> : null
                }
                <br/>
                <br/>
                <label style={{color: this.state.resultColor}}>
                    Filter By Ticket Status:
                    <select style={{margin: 5}} value={this.state.status} onChange={(e) => this.handleStatusFilter(e)}>
                        <option value='All'>All</option>
                        <option value='Pending'>Pending</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Closed">Closed</option>
                    </select>
                </label>
                <h1 style={{color: this.state.resultColor}}>Tickets List</h1>
                <header style={{backgroundColor: this.state.backgroundColor}}>
                    <input style={{backgroundColor: this.state.backgroundColor, color: this.state.searchColor}}
                           type="search" placeholder="Search..." onChange={(e) => this.onSearch(e.target.value)}/>
                </header>
                {tickets ? this.renderTickets(tickets) : <h2>Loading..</h2>}
            </main>)
    }
}

export default App;