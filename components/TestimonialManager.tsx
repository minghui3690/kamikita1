
import React, { useState, useEffect } from 'react';
import { testimonialApi } from '../services/testimonialService';
import { Icons } from '../constants';

const TestimonialManager: React.FC = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const data = await testimonialApi.getAllReviews();
            setReviews(data);
        } catch (e) {
            console.error(e);
            alert('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'Hide' : 'Show'} this review?`)) return;
        try {
            await testimonialApi.updateStatus(id, !currentStatus);
            setReviews(reviews.map(r => r.id === id ? { ...r, isPublic: !currentStatus } : r));
        } catch (e) {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this review?')) return;
        try {
            await testimonialApi.delete(id);
            setReviews(reviews.filter(r => r.id !== id));
        } catch (e) {
            alert('Failed to delete review');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Product Reviews Manager</h2>
                <button onClick={loadReviews} className="p-2 hover:bg-gray-100 rounded-full"><Icons.Refresh /></button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Rating</th>
                                <th className="px-6 py-4">Content</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reviews.length === 0 ? (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No reviews found</td></tr>
                            ) : (
                                reviews.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(r.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                            {r.user?.name}
                                            <div className="text-xs text-gray-400 font-normal">{r.user?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-blue-600">
                                            {r.product?.nameproduct}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-yellow-500 font-bold whitespace-nowrap">
                                            {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={r.content}>
                                            {r.content}
                                            {r.image && <div className="text-xs text-blue-500 mt-1">[ Photo Attached ]</div>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${r.isPublic ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {r.isPublic ? 'Public' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                                            <button 
                                                onClick={() => handleToggleStatus(r.id, r.isPublic)}
                                                className={`text-xs font-bold px-3 py-1 rounded border min-w-[60px] ${r.isPublic ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                                            >
                                                {r.isPublic ? 'Hide' : 'Unhide'}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(r.id)}
                                                className="text-xs font-bold px-3 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TestimonialManager;
