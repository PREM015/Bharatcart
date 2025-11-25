'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTokenPayload } from '@/utils/jwt';
import { PrismaClient, Admin, User } from '@prisma/client';

const prisma = new PrismaClient();

type AdminProfile = Admin & { user: User };

export default function AdminPage() {
    const router = useRouter();
    const [adminData, setAdminData] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const payload = getTokenPayload(token);
                if (!payload?.userId || !payload?.isAdmin) {
                    router.push('/');
                    return;
                }

                const res = await fetch('/api/admin', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) throw new Error('Not authorized');

                const data = await res.json();
                setAdminData(data);
            } catch (error) {
                console.error('Error loading admin:', error);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [router]);

    if (loading) return <div className="p-4">Loading...</div>;

    if (!adminData)
        return <div className="p-4 text-red-500">Admin not found or unauthorized</div>;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Welcome, {adminData.user.name} 👋</h1>
            <div className="space-y-2 bg-gray-100 p-4 rounded-xl shadow">
                <p><strong>Store Name:</strong> {adminData.storeName}</p>
                <p><strong>Store URL:</strong> {adminData.storeUrl || 'Not set'}</p>
                <p><strong>Verified:</strong> {adminData.isVerified ? 'Yes' : 'No'}</p>
                <p><strong>Email:</strong> {adminData.user.email || 'No email'}</p>
                <p><strong>Phone:</strong> {adminData.user.phone || 'No phone'}</p>
            </div>
        </div>
    );
}
