export interface Customer {
    customerid?: number;
    name: string;
    username: string;
    email: string;
    number: string;
    password?: string;
    profile_picture?: string;
}

export interface Product {
    productid?: number;
    productname: string;
    price: string | number;
    image?: string;
}

export interface InvoiceItem {
    product: number;
    quantity: number;
    price_at_purchase?: string | number;
}

export interface Invoice {
    invoiceid?: number;
    customer: number;
    date?: string;
    is_paid: boolean;
    payment_method: string;
    subtotal?: string | number;
    tax?: string | number;
    total?: string | number;
    items: InvoiceItem[];
    amount_paid?: number | string;
    change?: number | string;
}
