'use client';
import {useEffect,useRef,useState} from 'react';
import type {Order} from '@/lib/order-types';
import {apiRequest,requestError} from '@/lib/client-api';
export default function DeleteOrder({order,onDeleted,onClose}:{order:Order;onDeleted:(id:string)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);const cancel=useRef<HTMLButtonElement>(null);const busy=useRef(false);const [pending,setPending]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();cancel.current?.focus();},[]);
 async function remove(){if(busy.current)return;busy.current=true;setPending(true);setError('');try{await apiRequest<void>(`/api/orders/${order.id}`,{method:'DELETE'});onDeleted(order.id);}catch(problem){setError(requestError(problem));}finally{busy.current=false;setPending(false);}}
 return <dialog ref={dialog} className="order-dialog delete-dialog" aria-labelledby="delete-title" onCancel={event=>{if(pending)event.preventDefault();else onClose();}}><p className="eyebrow">REMOVE AN ACCIDENTAL ENTRY</p><h2 id="delete-title">Delete this order?</h2><p className="dialog-intro">The order for <strong>{order.customerName}</strong> ({order.productName}) will be removed from this running demo. This action cannot be undone.</p>{error&&<div className="error-box" role="alert">{error}</div>}<div className="dialog-actions"><button ref={cancel} className="button button-quiet" disabled={pending} onClick={onClose}>Keep order</button><button className="button button-danger" disabled={pending} onClick={remove}>{pending?'Deleting…':'Delete order'}</button></div></dialog>;
}
