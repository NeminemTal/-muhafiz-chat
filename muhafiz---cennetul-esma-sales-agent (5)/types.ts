export enum Sender {
  USER = 'user',
  BOT = 'model'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

export interface OrderDetails {
  name: string;
  address: string;
  phone: string;
  paymentMethod: string;
}

// Response from the Netlify function
export interface ChatResponse {
  text: string;
  toolCall?: {
    name: string;
    args: any;
  };
}