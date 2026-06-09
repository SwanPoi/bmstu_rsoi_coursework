export function formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseDateFromApi(dateStr: string): Date {
    return new Date(dateStr);
}

export function validateDateRange(from: Date, to: Date): string | null {
    if (!from || !to) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (from < today) return 'Дата начала не может быть в прошлом';
    if (to < from) return 'Дата окончания не может быть раньше даты начала';
    
    const maxDays = 30;
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > maxDays) return `Максимальный срок аренды — ${maxDays} дней`;
    
    return null;
}