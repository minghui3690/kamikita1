
import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';
import { Icons } from '../constants';

interface PaymentModalProps {
    amount: number;
    paymentMethod: 'BANK_TRANSFER' | 'GATEWAY';
    config: SystemSettings['paymentConfig'];
    onConfirm: (proof?: string) => void;
    onCancel: () => void;
    redirectUrl?: string; 
    onGatewayInitiate?: () => Promise<string | null>; // Returns Snap Token
}

const PaymentModal: React.FC<PaymentModalProps> = ({ amount, paymentMethod, config, onConfirm, onCancel, redirectUrl, onGatewayInitiate }) => {

    const [proof, setProof] = useState('');
    const [step, setStep] = useState<'INSTRUCTION' | 'PROCESSING' | 'SUCCESS'>('INSTRUCTION');
    const [snapLoaded, setSnapLoaded] = useState(false);

    useEffect(() => {
        // Load Snap JS if Gateway
        if (paymentMethod === 'GATEWAY' && config.midtrans) {
             const clientKey = config.midtrans.clientKey || "SB-Mid-client-TEST";
             const isProd = config.midtrans.isProduction || false;
             const snapUrl = isProd ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
             
             const scriptId = 'midtrans-script';
             if (!document.getElementById(scriptId)) {
                 const script = document.createElement('script');
                 script.src = snapUrl;
                 script.id = scriptId;
                 script.setAttribute('data-client-key', clientKey);
                 script.onload = () => setSnapLoaded(true);
                 document.body.appendChild(script);
             } else {
                 setSnapLoaded(true);
             }
        }
    }, [config, paymentMethod]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (x) => {
                if (x.target?.result) setProof(x.target.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSuccess = (proofData?: string) => {
        setStep('SUCCESS');
        setTimeout(() => {
            onConfirm(proofData);
            if (redirectUrl) {
                window.open(redirectUrl, '_blank');
            }
        }, 2000);
    };

    const handleManualSubmit = () => {
        if (!proof) {
            alert('Please upload transfer proof.');
            return;
        }
        setStep('PROCESSING');
        setTimeout(() => {
            handleSuccess(proof);
        }, 1500);
    };

    const handleGatewayPay = async () => {
        if (!onGatewayInitiate) {
             // Fallback to simulation
             setStep('PROCESSING');
             setTimeout(() => {
                 handleSuccess();
             }, 2000);
             return;
        }

        setStep('PROCESSING');
        try {
            const token = await onGatewayInitiate();
            if (!token) throw new Error('No payment token received');

            if (window.snap) {
                window.snap.pay(token, {
                    onSuccess: function(result: any){
                        console.log('success', result);
                        handleSuccess(); 
                    },
                    onPending: function(result: any){
                        console.log('pending', result);
                        handleSuccess(); 
                    },
                    onError: function(result: any){
                        console.log('error', result);
                        setStep('INSTRUCTION');
                        alert('Payment failed!');
                    },
                    onClose: function(){
                        console.log('customer closed the popup without finishing the payment');
                        setStep('INSTRUCTION');
                    }
                });
            } else {
                alert('Payment Gateway not loaded properly. Please refresh.');
                setStep('INSTRUCTION');
            }
        } catch (error: any) {
            console.error(error);
            alert('Failed to initiate payment: ' + error.message);
            setStep('INSTRUCTION');
        }
    };

    if (step === 'SUCCESS') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                        <Icons.Check />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                    <p className="text-gray-500 mb-4">{redirectUrl ? 'Redirecting you to next step...' : 'Completing transaction...'}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                        <div className="bg-green-500 h-1.5 rounded-full animate-pulse w-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold">Complete Payment</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white"><Icons.X /></button>
                </div>

                {paymentMethod === 'BANK_TRANSFER' ? (
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                            <p className="text-sm text-gray-500 mb-1">Total to Pay</p>
                            <p className="text-3xl font-bold text-blue-700">Rp {amount.toLocaleString()}</p>
                        </div>

                        {/* QRIS */}
                        {config.qris && config.qris.image && (
                            <div className="text-center border-b pb-4">
                                <p className="font-bold text-sm mb-2 text-gray-700">Scan QRIS</p>
                                <img src={config.qris.image} className="w-48 h-48 object-contain mx-auto border rounded-lg shadow-sm bg-white" />
                                {config.qris.nmid && <p className="text-xs text-gray-500 mt-1">{config.qris.nmid}</p>}
                            </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-sm font-bold text-gray-700">Transfer Destination:</p>
                            {(config.manualMethods && config.manualMethods.length > 0) ? (
                                config.manualMethods.map((m, idx) => (
                                    <div key={idx} className="border p-3 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {m.logo ? <img src={m.logo} className="w-8 h-8 object-contain bg-white rounded" /> : <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">{m.name.charAt(0)}</div>}
                                            <div>
                                                <p className="font-bold text-sm">{m.name} <span className="text-xs font-normal text-gray-500">({m.type})</span></p>
                                                <p className="text-xs text-gray-500">{m.accountHolder}</p>
                                            </div>
                                        </div>
                                        <div className="text-right cursor-pointer group" onClick={() => { navigator.clipboard.writeText(m.accountNumber); alert(`Copied ${m.accountNumber}`); }}>
                                            <p className="font-mono font-bold text-sm text-blue-600 flex items-center gap-1 justify-end">{m.accountNumber} <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Document /></span></p>
                                            <p className="text-xs text-gray-400">Tap to Copy</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="border p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-gray-500">Bank Name</p>
                                        <p className="font-bold">{config.bankName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Account Holder</p>
                                        <p className="font-bold">{config.accountHolder}</p>
                                    </div>
                                    <div className="p-2 cursor-pointer bg-gray-100 rounded" onClick={() => navigator.clipboard.writeText(config.accountNumber)}>
                                        <p className="font-mono font-bold">{config.accountNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-medium mb-2">Upload Proof of Transfer</label>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            {proof && <img src={proof} className="mt-2 h-20 w-auto rounded border" alt="Proof" />}
                        </div>

                        <button 
                            onClick={handleManualSubmit}
                            disabled={!proof || step === 'PROCESSING'}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {step === 'PROCESSING' ? 'Verifying...' : 'Confirm Payment'}
                        </button>
                    </div>
                ) : (
                    // MIDTRANS SNAP
                    <div className="flex flex-col h-[500px]">
                        <div className="flex-1 bg-gray-50 flex items-center justify-center p-6">
                            <div className="bg-white w-full max-w-sm rounded-lg shadow-xl border overflow-hidden">
                                <div className="bg-blue-600 p-3 flex justify-between items-center">
                                    <span className="text-white font-bold text-sm">Midtrans</span>
                                    <span className="text-white/80 text-xs">{config.midtrans?.isProduction ? 'Secure' : 'Sandbox'}</span>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                                        <span className="text-gray-600">Total</span>
                                        <span className="text-xl font-bold">Rp {amount.toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-3 mb-6">
                                        <div className="p-3 border rounded flex items-center gap-3 bg-gray-50 opacity-80">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">QR</div>
                                            <div>
                                                <p className="font-bold text-sm">GoPay / QRIS</p>
                                            </div>
                                        </div>
                                        <div className="p-3 border rounded flex items-center gap-3 bg-gray-50 opacity-80">
                                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-700">VA</div>
                                            <div>
                                                <p className="font-bold text-sm">Virtual Account</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleGatewayPay}
                                        disabled={step === 'PROCESSING'}
                                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {step === 'PROCESSING' ? 'Loading Snap...' : 'Pay Now'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t text-center text-xs text-gray-400">
                             Secured by Midtrans
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
