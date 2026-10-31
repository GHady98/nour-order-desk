import { randomUUID } from 'node:crypto';
import type { Order, OrderInput } from './order-types';
import { calculateTotal, parseInput } from './order-validation';
// One global key shares the store across independently bundled Route Handlers.
// This is temporary single-process learning storage, not durable persistence.
const processGlobal=globalThis as typeof globalThis & {nourOrderDeskStore?:Map<string,Order>};
const seed:Order[]=[
 {id:'demo-001',customerName:'Mira Demo',phone:'DEMO-001',productName:'Vanilla Candle',quantity:2,unitPrice:8,total:16,status:'Pending'},
 {id:'demo-002',customerName:'Sami Example',phone:'DEMO-002',productName:'Cedar Candle',quantity:1,unitPrice:10,total:10,status:'Preparing'},
 {id:'demo-003',customerName:'Lina Sample',phone:'DEMO-003',productName:'Mini Gift Candle',quantity:3,unitPrice:6,total:18,status:'Delivered'},
];
const store=processGlobal.nourOrderDeskStore??=new Map(seed.map(order=>[order.id,{...order}]));
export function listOrders(){return [...store.values()].map(order=>({...order}));}
export function getOrder(id:string){const order=store.get(id);return order?{...order}:undefined;}
export function createOrder(body:unknown):Order {
 const input=parseInput(body,false) as OrderInput;
 const order:Order={...input,id:randomUUID(),status:'Pending',total:calculateTotal(input.quantity,input.unitPrice)};
 store.set(order.id,order);return {...order};
}
export function updateOrder(id:string,body:unknown):Order|undefined {
 const existing=store.get(id);if(!existing)return undefined;
 const changes=parseInput(body,true);
 const candidate:Order={...existing,...changes};
 candidate.total=calculateTotal(candidate.quantity,candidate.unitPrice);
 // Validation and derived total finish before this single atomic mutation.
 store.set(id,candidate);return {...candidate};
}
export function deleteOrder(id:string){return store.delete(id);}
