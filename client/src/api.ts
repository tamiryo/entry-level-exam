import axios from 'axios';
import {APIRootPath} from '@fed-exam/config';

export type Ticket = {
    id: string,
    title: string;
    content: string;
    creationTime: number;
    userEmail: string;
    labels?: string[];
    pinned?: boolean
    status: string
    showMore?: boolean
}

export type ApiClient = {
    getTickets: (page: number) => Promise<Ticket[]>;
    clone: (ticket: Ticket, index: number) => Promise<Ticket>;
    setPin: (ticket: Ticket, operation: string, index: number) => Promise<string>;
    updateStatus: (ticketId: string, status: string) => Promise<string>;
    bonusSearch: (searchVal: String[]) => Promise<Ticket[]>;
}

export const createApiClient = (): ApiClient => {
    return {
        getTickets: (page: number) => {
            return axios.get(APIRootPath, {params: {page}}).then((res) => res.data);
        },
        clone: (ticket: Ticket, index: number) => {
            return axios.post(APIRootPath, {ticket, index}).then((res) => res.data);
        },
        setPin: (ticket: Ticket, operation: string, index: number) => {
            return axios.post(APIRootPath + '/pin', {ticket, operation, index}).then((res) => res.data);
        },
        updateStatus: (ticketId: string,status: string) => {
            return axios.post(APIRootPath + '/status', {ticketId, status}).then((res) => res.data);
        },
        bonusSearch: (searchVal: String[]) => {
            return axios.get(APIRootPath + '/bsearch', {params: {searchVal}}).then((res) => res.data);
        },
    }
}
