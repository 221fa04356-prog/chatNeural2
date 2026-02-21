export const formatDateForSeparator = (dateString, currentDate = new Date()) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date(currentDate);
    const yesterday = new Date(currentDate);
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    if (isSameDay(date, today)) {
        return 'Today';
    }

    if (isSameDay(date, yesterday)) {
        return 'Yesterday';
    }

    // Check if within the last 7 days for "Day of week"
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    // Older dates: Day, Date Month (e.g., Monday, 12 June)
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' });
};
