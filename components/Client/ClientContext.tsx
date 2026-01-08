import React, { createContext, useContext } from 'react';
import { Address } from './AddressCard';

interface ClientContextType {
    addresses: Address[];
    loadingAddresses: boolean;
    loading: boolean;
    refreshAddresses: () => void;
    userId: string | null;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClientData = () => {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClientData must be used within a ClientLayout (ClientProvider)');
    }
    return context;
};

export default ClientContext;
