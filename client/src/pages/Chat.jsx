import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import logo from '../assets/logo.png';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare, CircleDashed, Users, MoreVertical, Plus,
    Search, Settings, Phone, Video, Paperclip, Smile, Mic, Send,
    ArrowLeft, CheckCheck, User as UserIcon, FileText, Calendar, X, Star, ChevronDown, ChevronRight, ChevronLeft, Bell,
    Info, Reply, Copy, Forward, Pin, CheckSquare, Download, Trash2, Archive, BellOff, HeartOff, XCircle, Lock, List, Heart, ThumbsDown, Share, Pencil, Image, StarOff, Camera, Link2 as LinkIcon,
    LayoutGrid, UserPlus, ArrowRight, Share2, Crop, Check, RotateCcw, Minus, Delete, User, Play,
    ShieldCheck, Monitor, BellRing, Laptop, LogOut, Globe, Clock, Building2, Mail, Briefcase, ExternalLink,
    ShieldAlert, Fingerprint, HardDrive, Keyboard, HelpCircle, Settings2, Volume2, MonitorSmartphone
} from 'lucide-react';
import io from 'socket.io-client';
import '../styles/Chat.css';
import '../styles/PrivacySettings.css';
import { formatDateForSeparator } from '../utils/dateUtils';
import Snackbar from '../components/Snackbar';
import { getTranslator, getLangCode } from '../utils/translations';

import NeuralBackground from '../components/NeuralBackground';
import ConfirmModal from '../components/ConfirmModal';

// --- Socket Link ---
// --- Socket Link ---
// --- Socket Link ---
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(SOCKET_URL, {
    autoConnect: false, // Don't connect until we have a token
    transports: ['websocket', 'polling'], //  Try WebSocket first, then polling
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});

const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function Chat() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const chatMessagesRef = useRef(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    // --- File Upload State ---
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    // --- UI States ---
    const [view, setView] = useState('chats'); // 'chats' | 'profile' | 'status' etc.
    const [isProfileOpen, setIsProfileOpen] = useState(false); // Controls the "Profile Drawer" overlay
    const [isNewChatOpen, setIsNewChatOpen] = useState(false); // Controls the "New Chat" drawer
    const [isNewGroupOpen, setIsNewGroupOpen] = useState(false); // Controls the "New Group" drawer
    const [showMenu, setShowMenu] = useState(false);
    const [archivedChatIds, setArchivedChatIds] = useState(() => {
        const saved = localStorage.getItem(`archivedChats_${user.id || user._id}`);
        return saved ? JSON.parse(saved) : [];
    }); // List of archived user/group IDs
    const [isArchivedChatsOpen, setIsArchivedChatsOpen] = useState(false);


    const [userData, setUserData] = useState(user); // For Profile Display
    const [searchQuery, setSearchQuery] = useState('');
    const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
    const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);

    const [isContactInfoOpen, setIsContactInfoOpen] = useState(false); // Controls "Contact Info" panel
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'favorites'
    const [openDropdown, setOpenDropdown] = useState(null); // { type: 'msg'|'contact', id: string }
    const [chatContextMenu, setChatContextMenu] = useState(null); // { x: number, y: number }
    const [replyingTo, setReplyingTo] = useState(null); // { _id: string, content: string, senderName: string }
    const [infoMessage, setInfoMessage] = useState(null); // Message details view
    const [snackbar, setSnackbar] = useState(null); // For feedback
    const [typingLinkPreview, setTypingLinkPreview] = useState(null); // For typing preview overlay
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [msgToDelete, setMsgToDelete] = useState(null);
    const selectedUserRef = useRef(null);
    const userRef = useRef(user);
    const searchSource = useRef('chat_header'); // 'chat_header' | 'contact_info'
    const isInitialFetchDone = useRef(false);
    const usersRef = useRef([]);

    // --- Forwarding State ---
    const [isForwardingMode, setIsForwardingMode] = useState(false);
    const [isChatSelectionMode, setIsChatSelectionMode] = useState(false); // To separate "Select" from "Forward" flow
    const [forwardSelectedMsgs, setForwardSelectedMsgs] = useState([]); // List of message objects
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [forwardSearchQuery, setForwardSearchQuery] = useState('');
    const longPressTimer = useRef(null);
    const [selectedForwardContacts, setSelectedForwardContacts] = useState([]); // List of user objects
    const [showForwardLimitWarning, setShowForwardLimitWarning] = useState(false);

    // --- Search State ---
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // --- Edit Contact State ---
    const [isEditContactOpen, setIsEditContactOpen] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editCountry, setEditCountry] = useState({ name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' });
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

    // --- Shared Media & Selection State ---
    const [isSharedMediaOpen, setIsSharedMediaOpen] = useState(false);
    const [isStarredMessagesOpen, setIsStarredMessagesOpen] = useState(false); // New state for Starred Messages
    const [isGlobalStarredOpen, setIsGlobalStarredOpen] = useState(false); // For starred from main menu
    const [globalStarredMessages, setGlobalStarredMessages] = useState([]);
    const [isGlobalStarredLoading, setIsGlobalStarredLoading] = useState(false);
    const [sharedMediaTab, setSharedMediaTab] = useState('media'); // 'media', 'docs', 'links'
    const [selectedMediaMsgs, setSelectedMediaMsgs] = useState([]);
    const [viewingImage, setViewingImage] = useState(null); // Track image for full-screen view
    const [previewVideoUrl, setPreviewVideoUrl] = useState(null); // URL for YouTube preview
    const [isStarredMenuOpen, setIsStarredMenuOpen] = useState(false); // Menu for Starred Panel
    const [isGlobalStarredMenuOpen, setIsGlobalStarredMenuOpen] = useState(false); // Menu for Global Starred drawer
    const [isUnstarConfirmOpen, setIsUnstarConfirmOpen] = useState(false); // Confirmation bar
    const [unstarTarget, setUnstarTarget] = useState('current'); // 'current' or 'global'
    const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
    const [showUnreadBanner, setShowUnreadBanner] = useState(true);
    const starredMenuRef = useRef(null);
    const globalStarredMenuRef = useRef(null);
    const filtersRef = useRef(null);

    // --- Mute State ---
    const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
    const [muteTargetUser, setMuteTargetUser] = useState(null); // { id: string, name: string }
    const [muteDuration, setMuteDuration] = useState('8 hours'); // '8 hours' | '1 week' | 'Always'
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState(null);
    const [isSettingsEditing, setIsSettingsEditing] = useState(false);

    // --- General Settings State ---
    const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('neuChat_language') || 'British English, British English');
    const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem('neuChat_theme') || 'Dark');
    const [selectedFontSize, setSelectedFontSize] = useState(() => localStorage.getItem('neuChat_fontSize') || '100% (default)');
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false);
    const [pendingLanguage, setPendingLanguage] = useState(null); // language awaiting confirmation
    const [isLangConfirmOpen, setIsLangConfirmOpen] = useState(false);
    const [privacySettings, setPrivacySettings] = useState({
        lastSeen: 'Everyone',
        onlineStatus: 'Everyone',
        profilePhoto: 'Everyone',
        about: 'Everyone',
        status: 'Everyone',
        readReceipts: true,
        typingIndicator: true,
        whoCanMessageMe: 'Everyone',
        messageRequestsRequired: true,
        blockUnknown: false,
        whoCanAddMeToGroups: 'Everyone',
        requireConsentBeforeForward: false,
        forwardLimit: 5,
        notifyOnForward: false,
        sensitiveDataScan: true,
        autoRedact: false,
        scamDetection: true,
        phishingDetection: true,
        threatAlertSensitivity: 'Medium',
        screenshotDetection: true,
        notifyOnScreenshot: true,
        blurOnScreenshot: false,
        addWatermark: false,
        restrictApprovedDevices: false,
        requireApprovalNewDevice: true,
        autoLockLocationChange: false,
        geoFencedMessages: false,
        restrictedCountry: 'None',
        hiddenChatsFolder: false,
        decoyMode: false,
        panicMode: false,
        showPrivacyScore: true,
        showEncryptionBadge: true,
        showRiskAlerts: true
    });
    const fontSizesArr = [
        '25%', '33%', '50%', '67%', '75%', '80%', '90%',
        '100% (default)',
        '110%', '125%', '150%', '175%', '200%', '250%', '300%', '400%', '500%'
    ];

    // --- Advanced Browser Zoom Synchronization ---
    const [baseDPR, setBaseDPR] = useState(() => {
        const stored = localStorage.getItem('neuChat_baseDPR');
        if (stored) return parseFloat(stored);
        localStorage.setItem('neuChat_baseDPR', window.devicePixelRatio.toString());
        return window.devicePixelRatio;
    });

    const [browserScale, setBrowserScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            // Detect current browser zoom level relative to baseline
            const currentScale = window.devicePixelRatio / baseDPR;
            setBrowserScale(currentScale);

            // Sync the "Font Size" setting with the browser zoom if they are close
            const currentPercent = Math.round(currentScale * 100);
            const matchingSize = fontSizesArr.find(s => parseInt(s) === currentPercent);
            if (matchingSize && matchingSize !== selectedFontSize) {
                setSelectedFontSize(matchingSize);
                localStorage.setItem('neuChat_fontSize', matchingSize);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
    }, [baseDPR, selectedFontSize]);

    useEffect(() => {
        const targetScale = parseInt(selectedFontSize) / 100;
        const internalZoom = targetScale / browserScale;

        const container = document.querySelector('.wa-app-container');
        if (container) {
            // Apply zoom factor specifically to the app container
            // and COMPENSATE dimensions to ensure it always fills 100% of the viewport.
            // Support range from 25% (0.25) to 500% (5.0)
            if (internalZoom >= 0.25 && internalZoom <= 5.0) {
                container.style.zoom = internalZoom;
                container.style.width = `${100 / internalZoom}vw`;
                container.style.height = `${100 / internalZoom}vh`;
                // Add transform-origin to ensure it scales from the top-left correctly
                container.style.transformOrigin = 'top left';
                document.body.style.backgroundColor = '#111b21';
            } else {
                container.style.zoom = '1';
                container.style.width = '100vw';
                container.style.height = '100vh';
            }
        }
    }, [selectedFontSize, browserScale]);

    const handleFontSizeChange = (size) => {
        setSelectedFontSize(size);
        localStorage.setItem('neuChat_fontSize', size);

        // CALIBRATION: If user manually selects 100%, we recalibrate the baseline
        // to match the current browser state. This fix synchronizes the app and browser.
        if (size.includes('100%')) {
            const currentDPR = window.devicePixelRatio;
            setBaseDPR(currentDPR);
            localStorage.setItem('neuChat_baseDPR', currentDPR.toString());
            setSnackbar({ message: 'Scale calibrated to 100%', type: 'success', variant: 'system' });
        }
    };

    // Derive translator from the currently selected language (re-computed on every render,
    // so after a reload the correct translations are immediately active).
    const t = getTranslator(getLangCode(selectedLanguage));

    // --- Grammar Suggestion State ---
    const [grammarSuggestions, setGrammarSuggestions] = useState(null);
    const [isGrammarLoading, setIsGrammarLoading] = useState(false);
    const [showGrammarBar, setShowGrammarBar] = useState(false);

    const [isEditingProfileName, setIsEditingProfileName] = useState(false);

    const handleUpdateProfile = async () => {
        const cleanMobile = (userData.mobile || '').replace(/\D/g, '');
        const payload = {
            userId: userData.id || userData._id || user.id || user._id,
            mobile: cleanMobile,
            about: userData.about
        };
        console.log('[CLIENT] Attempting profile update with payload:', payload);

        if (!payload.userId) {
            console.error('[CLIENT] Error: No user ID found in session');
            setSnackbar({ message: 'Session error: User ID missing. Please re-login.', type: 'error' });
            return;
        }

        if (payload.mobile && payload.mobile.length !== 10) {
            setSnackbar({ message: 'Error: Mobile number must be exactly 10 digits', type: 'error' });
            return;
        }

        try {
            const res = await axios.put('/api/auth/update-profile', payload);
            console.log('[CLIENT] Update successful:', res.data);

            if (res.data.user) {
                // Merge with current userData to preserve fields like 'image' not returned by endpoint
                const updatedUser = { ...userData, ...res.data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUserData(updatedUser);
                setSnackbar({ message: 'Profile Updated successfully', type: 'success', variant: 'system' });
                setIsSettingsEditing(false);
            }
        } catch (err) {
            console.error('[CLIENT] Update failed details:', {
                status: err.response?.status,
                data: err.response?.data,
                message: err.message
            });
            const errorMsg = err.response?.data?.error || err.message || 'Network error occurred';
            setSnackbar({ message: `Update Failed: ${errorMsg}`, type: 'error' });
        }
    };
    const [isEditingProfileAbout, setIsEditingProfileAbout] = useState(false);
    const [isEditingProfilePhone, setIsEditingProfilePhone] = useState(false);
    const [profileEditValue, setProfileEditValue] = useState("");

    // --- Delete Modal State ---
    const [deleteOption, setDeleteOption] = useState('me'); // 'me' | 'everyone'
    const [newGroupStep, setNewGroupStep] = useState(1);
    const [groupSubject, setGroupSubject] = useState('');
    const [isGroupIconMenuOpen, setIsGroupIconMenuOpen] = useState(false);
    const groupIconMenuRef = useRef(null);

    // --- Group Permissions State ---
    const [groupPerms, setGroupPerms] = useState({
        editSettings: true,
        sendMessages: true,
        addMembers: true,
        inviteLink: false,
        approveMembers: false
    });
    const [permissionToasts, setPermissionToasts] = useState([]);
    const [cameraModal, setCameraModal] = useState('none'); // 'none' | 'permission' | 'blocked' | 'active' | 'adjust'
    const [cameraStream, setCameraStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);

    useEffect(() => {
        if (user.id || user._id) {
            localStorage.setItem(`archivedChats_${user.id || user._id}`, JSON.stringify(archivedChatIds));
        }
    }, [archivedChatIds, user.id, user._id]);
    const [groupIcon, setGroupIcon] = useState(null);
    const [groups, setGroups] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(450);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const selectedGroupRef = useRef(null);
    const [groupMessages, setGroupMessages] = useState([]);
    const [groupInput, setGroupInput] = useState('');
    const [isNamingGroup, setIsNamingGroup] = useState(false);
    const [namingGroupValue, setNamingGroupValue] = useState('');
    const [imageScale, setImageScale] = useState(1);
    const [imagePos, setImagePos] = useState({ x: 0, y: 0 });
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isPhoneNumberPanelOpen, setIsPhoneNumberPanelOpen] = useState(false);
    const [phoneNumberInput, setPhoneNumberInput] = useState('');

    const videoRef = useRef(null);
    const imageRef = useRef(null);

    const showPermissionToast = (message) => {
        const id = Date.now();
        setPermissionToasts(prev => [...prev, { id, message }]);
        setTimeout(() => {
            setPermissionToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };


    const countries = [
        { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
        { name: 'Indonesia', code: 'ID', dial: '+62', flag: '🇮🇩' },
        { name: 'Iran', code: 'IR', dial: '+98', flag: '🇮🇷' },
        { name: 'Iraq', code: 'IQ', dial: '+964', flag: '🇮🇶' },
        { name: 'Ireland', code: 'IE', dial: '+353', flag: '🇮🇪' },
        { name: 'Isle of Man', code: 'IM', dial: '+44', flag: '🇮🇲' },
        { name: 'Israel', code: 'IL', dial: '+972', flag: '🇮🇱' },
        { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
        // ... add more as needed
    ];

    const isMeMsg = (msg) => {
        if (!msg) return false;
        const myId = user.id || user._id;
        const sId = msg.sender_id?._id || msg.sender_id || msg.user_id;
        return String(sId) === String(myId);
    };

    // Helper function to convert image blob to PNG
    const convertToPng = (blob) => {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((pngBlob) => {
                    URL.revokeObjectURL(url); // Clean up
                    if (pngBlob) {
                        resolve(pngBlob);
                    } else {
                        reject(new Error('Failed to convert image to PNG'));
                    }
                }, 'image/png');
            };

            img.onerror = () => {
                URL.revokeObjectURL(url); // Clean up
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    };



    const handleCopyMessage = async (msg) => {
        if (!msg) {
            setOpenDropdown(null);
            return;
        }

        // Special handling for images - copy actual image data
        if (msg.type === 'image' && msg.file_path) {
            try {
                const rawImageUrl = msg.file_path.startsWith('http') ? msg.file_path : `${window.location.origin}${msg.file_path}`;
                const imageUrl = encodeURI(rawImageUrl);
                console.log('Attempting to copy image from:', imageUrl);

                // Check if we have modern clipboard API
                const hasClipboardAPI = navigator.clipboard && window.ClipboardItem;
                console.log('Clipboard API available:', hasClipboardAPI);

                if (!hasClipboardAPI) {
                    // HTTP Fallback: Use contenteditable div with image
                    console.log('Using HTTP fallback method for image copy');

                    try {
                        // Create a temporary contenteditable div
                        const container = document.createElement('div');
                        container.contentEditable = 'true';

                        // Make it technically visible but transparent (some browsers ignore off-screen selections)
                        container.style.position = 'fixed';
                        container.style.left = '0';
                        container.style.top = '0';
                        container.style.width = '1px';
                        container.style.height = '1px';
                        container.style.opacity = '0.01';
                        container.style.pointerEvents = 'none';
                        container.style.zIndex = '9999';

                        // Create an image element
                        const img = document.createElement('img');
                        img.crossOrigin = 'anonymous';

                        // Wait for image to load
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = () => reject(new Error('Failed to load image for fallback copy'));
                            img.src = imageUrl;
                        });

                        container.appendChild(img);
                        document.body.appendChild(container);

                        // Select the image
                        const range = document.createRange();
                        range.selectNodeContents(container);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);

                        // Give browser a moment to render
                        await new Promise(r => setTimeout(r, 50));

                        // Copy using execCommand
                        const successful = document.execCommand('copy');

                        // Clean up
                        document.body.removeChild(container);
                        selection.removeAllRanges();

                        if (successful) {
                            console.log('✅ Image copied using HTTP fallback');
                            setSnackbar({ message: 'Image copied to clipboard!', type: 'success', variant: 'system' });
                            setOpenDropdown(null);
                            return;
                        } else {
                            throw new Error('execCommand copy failed');
                        }
                    } catch (fallbackErr) {
                        console.error('HTTP fallback failed:', fallbackErr);
                        // Fall through to URL copy if this fails
                    }
                }

                // Modern Clipboard API (HTTPS/localhost)
                if (hasClipboardAPI) {
                    console.log('Using modern Clipboard API');

                    // Fetch the image as a blob
                    const response = await fetch(imageUrl);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch image: ${response.status}`);
                    }

                    let blob = await response.blob();
                    console.log('Image blob fetched, type:', blob.type, 'size:', blob.size);

                    // Some browsers require PNG format for clipboard
                    if (blob.type !== 'image/png') {
                        console.log('Converting image to PNG for clipboard compatibility');
                        blob = await convertToPng(blob);
                    }

                    // Copy image to clipboard using ClipboardItem
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ]);

                    console.log('✅ Image copied successfully');
                    setSnackbar({ message: 'Image copied to clipboard!', type: 'success', variant: 'system' });
                    setOpenDropdown(null);
                    return;
                }

            } catch (err) {
                console.error('Failed to copy image:', err);
                console.error('Error details:', err.message, err.stack);

                // Fallback to URL copy
                const imageUrl = msg.file_path.startsWith('http') ? msg.file_path : `${window.location.origin}${msg.file_path}`;
                const urlToCopy = msg.content ? `${msg.content}\n${imageUrl}` : imageUrl;

                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(urlToCopy);
                        setSnackbar({ message: 'Image URL copied!', type: 'info', variant: 'system' });
                    } else {
                        // Legacy fallback
                        const textArea = document.createElement("textarea");
                        textArea.value = urlToCopy;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-9999px';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        setSnackbar({ message: 'Image URL copied!', type: 'info', variant: 'system' });
                    }
                } catch (textErr) {
                    console.error('URL copy also failed:', textErr);
                    setSnackbar({ message: 'Copy failed', type: 'error', variant: 'system' });
                }
                setOpenDropdown(null);
                return;
            }
        }

        // For text, files, videos, audio - copy as text/URL
        let contentToCopy = '';
        if (msg.type === 'text') {
            contentToCopy = msg.content || '';
        } else if (msg.type === 'file' || msg.type === 'video' || msg.type === 'audio') {
            // Copy URL and content if available
            const url = msg.file_path ? (msg.file_path.startsWith('http') ? msg.file_path : `${window.location.origin}${msg.file_path}`) : '';
            contentToCopy = msg.content ? `${msg.content}\n${url}` : url;
        } else {
            // Fallback for any other type
            contentToCopy = msg.content || '';
        }

        if (contentToCopy) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(contentToCopy)
                    .then(() => {
                        setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                        setOpenDropdown(null);
                    })
                    .catch(() => {
                        // If clipboard API fails, try execCommand fallback
                        try {
                            const textArea = document.createElement("textarea");
                            textArea.value = contentToCopy;
                            textArea.style.position = 'fixed';
                            textArea.style.left = '-9999px';
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                        } catch (err) {
                            console.error('Fallback copy failed', err);
                            setSnackbar({ message: 'Failed to copy', type: 'error', variant: 'system' });
                        }
                        setOpenDropdown(null);
                    });
            } else {
                // Fallback for non-secure contexts
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = contentToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                } catch (err) {
                    console.error('Fallback copy failed', err);
                    setSnackbar({ message: 'Failed to copy', type: 'error', variant: 'system' });
                }
                setOpenDropdown(null);
            }
        } else {
            setSnackbar({ message: 'No content to copy', type: 'info', variant: 'system' });
            setOpenDropdown(null);
        }
    };

    const handleSearchClick = (msgId) => {
        const element = document.getElementById(`msg-${msgId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add temporary highlight class
            element.classList.add('wa-msg-highlight-anim');
            setTimeout(() => {
                element.classList.remove('wa-msg-highlight-anim');
            }, 2000);
        } else {
            console.warn('Message element not found:', msgId);
        }
    };

    const handleBulkStar = async () => {
        if (selectedMediaMsgs.length === 0) return;
        const ids = selectedMediaMsgs.map(m => m._id);
        const token = localStorage.getItem('token');
        try {
            const allStarred = selectedMediaMsgs.every(m => m.is_starred);
            await Promise.all(ids.map(id => axios.post(`/api/chat/message/${id}/toggle`, { action: 'star', value: !allStarred }, {
                headers: { 'Authorization': `Bearer ${token}` }
            })));
            setMessages(prev => prev.map(m => ids.includes(m._id) ? { ...m, is_starred: !allStarred } : m));
            setSnackbar({ message: `Messages ${allStarred ? 'unstarred' : 'starred'}`, type: 'success', variant: 'system' });
            setSelectedMediaMsgs([]);
        } catch (err) {
            console.error("Bulk star failed", err);
            setSnackbar({ message: "Failed to update stars", type: 'error' });
        }
    };

    const handleBulkDelete = () => {
        if (selectedMediaMsgs.length === 0) return;
        setMsgToDelete(selectedMediaMsgs.map(m => m._id));
        setIsDeleteModalOpen(true);
    };

    const handleBulkCopy = async () => {
        if (selectedMediaMsgs.length === 0) return;

        const texts = selectedMediaMsgs.map(m => {
            if (m.type === 'text') return m.content;
            const url = m.file_path ? (m.file_path.startsWith('http') ? m.file_path : `${window.location.origin}${m.file_path}`) : '';
            if (url) return `${m.content || ''}\n${url}`.trim();
            return m.content || '';
        }).join('\n---\n');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texts).then(() => {
                setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                setSelectedMediaMsgs([]);
            }).catch(err => {
                console.error('Bulk copy failed', err);
                setSnackbar({ message: 'Failed to copy', type: 'error', variant: 'system' });
            });
        } else {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = texts;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                setSelectedMediaMsgs([]);
            } catch (err) {
                console.error('Fallback bulk copy failed', err);
                setSnackbar({ message: 'Failed to copy', type: 'error', variant: 'system' });
            }
        }
    };

    const handleBulkForward = () => {
        if (selectedMediaMsgs.length === 0) return;
        // Don't set isForwardingMode(true) to avoid global checkboxes in main chat
        setForwardSelectedMsgs(selectedMediaMsgs);
        setIsForwardModalOpen(true);
        // Don't close Shared Media Panel - user wants it to stay open
        // setIsSharedMediaOpen(false); 
        // We clear selectedMediaMsgs only after sending or if explicitly requested.
        // For now, let's keep them selected so the user knows what's being forwarded.
    };

    // --- Bulk Actions for Main Chat Section ---
    const handleChatSelectionBulkStar = async () => {
        if (forwardSelectedMsgs.length === 0) return;
        const ids = forwardSelectedMsgs.map(m => m._id);
        const token = localStorage.getItem('token');
        try {
            const allStarred = forwardSelectedMsgs.every(m => m.is_starred);
            await Promise.all(ids.map(id => axios.post(`/api/chat/message/${id}/toggle`,
                { action: 'star', value: !allStarred },
                { headers: { 'Authorization': `Bearer ${token}` } }
            )));
            setMessages(prev => prev.map(m => ids.includes(m._id) ? { ...m, is_starred: !allStarred } : m));
            setSnackbar({ message: `Messages ${allStarred ? 'unstarred' : 'starred'}`, type: 'success', variant: 'system' });
            setIsForwardingMode(false);
            setIsChatSelectionMode(false);
            setForwardSelectedMsgs([]);
        } catch (err) {
            console.error("Bulk star failed", err);
            setSnackbar({ message: "Failed to update stars", type: 'error' });
        }
    };

    const handleChatSelectionBulkDelete = () => {
        if (forwardSelectedMsgs.length === 0) return;
        setMsgToDelete(forwardSelectedMsgs.map(m => m._id));
        setIsDeleteModalOpen(true);
    };

    const handleChatSelectionBulkCopy = async () => {
        if (forwardSelectedMsgs.length === 0) return;

        // If only one image is selected, use the high-quality image copy logic
        if (forwardSelectedMsgs.length === 1 && forwardSelectedMsgs[0].type === 'image') {
            await handleCopyMessage(forwardSelectedMsgs[0]);
            setIsForwardingMode(false);
            setIsChatSelectionMode(false);
            setForwardSelectedMsgs([]);
            return;
        }

        const texts = forwardSelectedMsgs.map(m => {
            if (m.type === 'text') return m.content;
            const rawUrl = m.file_path ? (m.file_path.startsWith('http') ? m.file_path : `${window.location.origin}${m.file_path}`) : '';
            const url = encodeURI(rawUrl);
            if (url) {
                // If there's a caption, include it
                if (m.content) return `${m.content}\n${url}`;
                return url;
            }
            return m.content || '';
        }).join('\n\n');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texts).then(() => {
                setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                setIsForwardingMode(false);
                setIsChatSelectionMode(false);
                setForwardSelectedMsgs([]);
            }).catch(err => {
                console.error('Bulk copy failed', err);
                setSnackbar({ message: 'Failed to copy', type: 'error', variant: 'system' });
            });
        } else {
            // Fallback
            try {
                const textArea = document.createElement("textarea");
                textArea.value = texts;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setSnackbar({ message: 'Copied to clipboard!', type: 'success', variant: 'system' });
                setIsForwardingMode(false);
                setIsChatSelectionMode(false);
                setForwardSelectedMsgs([]);
            } catch (err) {
                console.error('Fallback bulk copy failed', err);
                setSnackbar({ message: 'Failed to copy', type: 'error', variant: 'system' });
            }
        }
    };

    const handleChatSelectionBulkDownload = async () => {
        const mediaMsgs = forwardSelectedMsgs.filter(m => m.type === 'image' || m.type === 'video' || m.type === 'file' || m.type === 'audio');
        if (mediaMsgs.length === 0) {
            setSnackbar({ message: 'No media messages selected', type: 'info' });
            return;
        }

        for (const msg of mediaMsgs) {
            if (msg.file_path) {
                await handleDownload(msg.file_path, msg.fileName);
            }
        }
        setIsForwardingMode(false);
        setIsChatSelectionMode(false);
        setForwardSelectedMsgs([]);
    };

    // --- Grammar Suggestion Logic ---
    useEffect(() => {
        if (!input.trim() || input.length < 5) {
            setGrammarSuggestions(null);
            setShowGrammarBar(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsGrammarLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.post('/api/chat/grammar-check', { text: input }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setGrammarSuggestions(res.data);
                setShowGrammarBar(true);
            } catch (err) {
                console.error("Grammar check failed", err);
            } finally {
                setIsGrammarLoading(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [input]);

    const applyGrammarSuggestion = (text) => {
        setInput(text);
        setShowGrammarBar(false);
        setGrammarSuggestions(null);
    };

    const renderGrammarBar = () => {
        if (!showGrammarBar || !grammarSuggestions) return null;

        return (
            <div className="wa-grammar-bar">
                <div className="wa-grammar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#027eb5' }}>Neural Chat AI</span>
                        {isGrammarLoading && <div className="wa-grammar-loader" />}
                    </div>
                    <X size={16} style={{ cursor: 'pointer', color: '#667781' }} onClick={() => setShowGrammarBar(false)} />
                </div>
                <div className="wa-grammar-options">
                    <div className="wa-grammar-pill-wrapper" onClick={() => applyGrammarSuggestion(grammarSuggestions.basic)}>
                        <span className="pill-tag basic">BASIC</span>
                    </div>
                    <div className="wa-grammar-pill-wrapper" onClick={() => applyGrammarSuggestion(grammarSuggestions.fluent)}>
                        <span className="pill-tag fluent">FLUENT</span>
                    </div>
                    <div className="wa-grammar-pill-wrapper" onClick={() => applyGrammarSuggestion(grammarSuggestions.formal)}>
                        <span className="pill-tag formal">FORMAL</span>
                    </div>
                </div>
            </div>
        );
    };

    const formatForSearch = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
            + ', '
            + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // --- Message Search Debounce ---
    useEffect(() => {
        if (!messageSearchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const delayDebounceFn = setTimeout(() => {
            // Perform Search
            const results = [];
            const activeMsgs = selectedUser ? messages : groupMessages;

            if (Array.isArray(activeMsgs)) {
                activeMsgs.forEach(msg => {
                    if (msg.content && msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase())) {
                        const time = formatForSearch(msg.created_at);
                        results.push({ ...msg, time });
                    }
                });
            }

            // Sort newest first
            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setSearchResults(results);
            setIsSearching(false);
        }, 2000);

        return () => clearTimeout(delayDebounceFn);
    }, [messageSearchQuery, messages, groupMessages, selectedUser]);

    useEffect(() => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = input.match(urlRegex);
        if (match) {
            const url = match[0];
            // Only fetch if it's a new URL or preview is null
            if (!typingLinkPreview || typingLinkPreview.url !== url) {
                const timer = setTimeout(async () => {
                    try {
                        const token = localStorage.getItem('token');
                        const res = await axios.get(`/api/chat/link-preview?url=${encodeURIComponent(url)}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.data && res.data.title) {
                            setTypingLinkPreview(res.data);
                        } else {
                            setTypingLinkPreview(null);
                        }
                    } catch (err) {
                        console.error('Typing preview failed', err);
                        setTypingLinkPreview(null);
                    }
                }, 1000); // 1s debounce
                return () => clearTimeout(timer);
            }
            setTypingLinkPreview(null);
        }
    }, [input]);

    // Critical: Keep ref in sync with state for socket listeners
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        selectedGroupRef.current = selectedGroup;
    }, [selectedGroup]);

    // Sync usersRef with users state
    useEffect(() => {
        usersRef.current = users;
    }, [users]);

    // 1. Fetch Users on mount and connect socket
    // 1. Socket Lifecycle & Listeners
    useEffect(() => {
        if (!user.id) {
            navigate('/');
            return;
        }

        // --- Setup Listeners BEFORE Connecting ---

        const onConnect = () => {
            console.log('Socket: Connected as', user.id);
            if (selectedUserRef.current) {
                fetchP2PRequest(selectedUserRef.current._id);
            }
        };

        const onDisconnect = (reason) => {
            console.log('Socket: Disconnected, reason:', reason);
        };

        const onConnectError = (err) => {
            console.error('Socket: Connection Error:', err.message);
            setSnackbar({ message: `Reconnecting... (${err.message})`, type: 'info' });
        };

        const onReceiveMessage = (data) => {
            console.log('[DEBUG] Socket: receive_message', data);
            const senderId = data.sender_id || data.user_id;
            const currentSelected = selectedUserRef.current;
            const myId = userRef.current?.id || userRef.current?._id;

            console.log(`[DEBUG] onReceiveMessage: Sender: ${senderId}, Me: ${myId}, Selected: ${currentSelected?._id}`);

            // Ignore messages sent by ME (if server echoes them back)
            if (String(senderId) === String(myId)) {
                console.log('[DEBUG] Ignoring my own message echo.');
                return;
            }

            const isActiveChat = currentSelected && String(senderId) === String(currentSelected._id);

            if (isActiveChat) {
                console.log('[DEBUG] Active chat open, adding message to view and marking read.');
                setMessages(prev => {
                    if (prev.find(m => m._id === data._id)) return prev;
                    return [...prev, { ...data, role: 'user' }];
                });
                markAsRead(senderId);
            } else {
                console.log('[DEBUG] Background message from', senderId, '- showing notification.');

                const sender = usersRef.current.find(u => u._id === senderId);
                const senderName = sender ? (sender.name || sender.firstName || 'Someone') : 'New Message';
                const senderAvatar = sender ? sender.avatar : null;

                let previewText = 'Sent a message';
                if (data.type === 'text') previewText = data.content;
                else if (data.type === 'image') previewText = '📷 Sent an image';
                else if (data.type === 'video') previewText = '🎥 Sent a video';
                else if (data.type === 'audio') previewText = '🎤 Sent an audio message';
                else if (data.type === 'file') previewText = '📄 Sent a file';

                if (previewText.length > 50) previewText = previewText.substring(0, 50) + '...';

                setSnackbar({
                    senderName,
                    senderAvatar,
                    message: previewText,
                    type: 'info',
                    duration: 6000,
                    onReply: (text) => {
                        console.log(`[DEBUG] Snackbar onReply triggered. Target: ${senderId}, Text: ${text}`);
                        handleNotificationReply(text, senderId);
                    }
                });
            }

            fetchUsers();

            // Optimistic Update for Sidebar (Unread Count + Last Message + Counts)
            setUsers(prev => prev.map(u => {
                if (String(u._id) === String(senderId)) {
                    // If chat is active, don't increment unread (it's read immediately)
                    // If chat is NOT active, increment unread
                    const newUnread = isActiveChat ? 0 : (u.unreadCount || 0) + 1;

                    // Increment specific counters based on type
                    let newMediaCount = u.mediaCount || 0;
                    let newDocCount = u.docCount || 0;
                    let newLinkCount = u.linkCount || 0;

                    if (data.type === 'image' || data.type === 'video') newMediaCount++;
                    if (data.type === 'file') newDocCount++;
                    if (data.link_preview && data.link_preview.url) newLinkCount++;

                    return {
                        ...u,
                        unreadCount: newUnread,
                        mediaCount: newMediaCount,
                        docCount: newDocCount,
                        linkCount: newLinkCount,
                        lastMessage: {
                            content: data.content,
                            created_at: new Date().toISOString(),
                            type: data.type
                        }
                    };
                }
                return u;
            }).sort((a, b) => {
                // Sort by time
                const timeA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at) : 0;
                const timeB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at) : 0;
                return timeB - timeA;
            }));

            // REMOVED fetchUsers() to prevent race condition overwriting optimistic state
        };

        const onMessagesRead = (data) => {
            console.log('Socket: messages_read', data);
            const currentSelected = selectedUserRef.current;
            if (currentSelected && String(data.reader_id) === String(currentSelected._id)) {
                setMessages(prev => prev.map(msg => {
                    const myId = user.id || user._id;
                    const isMyMsg = (String(msg.sender_id) === String(myId)) || (String(msg.user_id) === String(myId));
                    if (isMyMsg && !msg.is_read) {
                        return { ...msg, is_read: true, read_at: data.read_at };
                    }
                    return msg;
                }));
            }
        };

        const onMessagesUnread = (data) => {
            console.log('[CLIENT] Socket: messages_unread received!', data);
            console.log('[CLIENT] Current user ID:', user.id);
            console.log('[CLIENT] Reader ID from event:', data.reader_id);

            const currentSelected = selectedUserRef.current;
            console.log('[CLIENT] Currently selected user:', currentSelected?._id);

            if (currentSelected && String(data.reader_id) === String(currentSelected._id)) {
                console.log('[CLIENT] Marking batch as unread. IDs:', data.message_ids);

                setMessages(prev => prev.map(msg => {
                    // Check if this message is in the affected batch
                    const isAffected = data.message_ids && data.message_ids.includes(String(msg._id));

                    if (isAffected) {
                        return { ...msg, is_read: false, read_at: null };
                    }
                    return msg;
                }));
            } else {
                console.log('[CLIENT] Not updating active view - reader ID mismatch or no chat open');
            }
        };

        const onStatusChange = (data) => {
            console.log('Socket: user_status_change', data);
            setUsers(prev => prev.map(u => {
                if (String(u._id) === String(data.userId)) {
                    return { ...u, isOnline: data.isOnline, lastSeen: data.lastSeen || u.lastSeen };
                }
                return u;
            }));

            const currentSelected = selectedUserRef.current;
            if (currentSelected && String(currentSelected._id) === String(data.userId)) {
                setSelectedUser(prev => prev ? ({
                    ...prev,
                    isOnline: data.isOnline,
                    lastSeen: data.lastSeen || prev.lastSeen
                }) : null);
            }
        };

        const onMessageDeleted = (data) => {
            console.log('Socket: message_deleted', data);
            setMessages(prev => prev.map(msg =>
                (msg._id === data.messageId || msg.id === data.messageId)
                    ? { ...msg, is_deleted_by_admin: data.is_deleted_by_admin, is_deleted_by_user: data.is_deleted_by_user }
                    : msg
            ));
            setGroupMessages(prev => prev.map(msg =>
                (msg._id === data.messageId || msg.id === data.messageId)
                    ? { ...msg, is_deleted_by_admin: data.is_deleted_by_admin, is_deleted_by_user: data.is_deleted_by_user }
                    : msg
            ));
            fetchUsers();
        };

        const onUserProfileUpdated = (data) => {
            console.log('Socket: user_profile_updated', data);
            setUsers(prev => prev.map(u =>
                String(u._id) === String(data.userId)
                    ? { ...u, name: data.name, mobile: data.mobile, about: data.about }
                    : u
            ));

            if (selectedUserRef.current && String(selectedUserRef.current._id) === String(data.userId)) {
                setSelectedUser(prev => ({ ...prev, name: data.name, mobile: data.mobile, about: data.about }));
            }
        };

        const onReconnectAttempt = (attempt) => {
            console.log(`Socket: Reconnecting attempt #${attempt}...`);
        };

        const onReconnectFailed = () => {
            console.error('Socket: Reconnection failed.');
            setSnackbar({ message: 'Connection failed. Please refresh.', type: 'error' });
        };

        // Attach Listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.io.on("reconnect_attempt", onReconnectAttempt);
        socket.io.on("reconnect_failed", onReconnectFailed);
        socket.on('receive_message', onReceiveMessage);
        socket.on('messages_read', onMessagesRead);
        socket.on('messages_unread', onMessagesUnread);
        socket.on('messages_unread_broadcast', (data) => {
            console.log('[CLIENT] Received broadcast test:', data);
            if (String(data.target) === String(user.id)) {
                console.log('[CLIENT] This broadcast is for me!');
                onMessagesUnread({ reader_id: data.reader_id, message_id: data.message_id });
            }
        });
        socket.on('user_status_change', onStatusChange);
        socket.on('message_deleted', onMessageDeleted);
        socket.on('user_profile_updated', onUserProfileUpdated);

        const onForceLogout = () => {
            console.warn('Socket: force_logout received. Another session was started.');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        };
        socket.on('force_logout', onForceLogout);

        // --- Connect ---
        socket.auth = { token: localStorage.getItem('token') };
        if (!socket.connected) {
            console.log('Socket: Attempting connect...');
            socket.connect();
        } else {
            // Already connected (e.g. after HMR), still run onConnect logic
            onConnect();
        }

        // Fetch users & groups, then set loaded state to prevent flicker
        Promise.all([fetchUsers(), fetchGroups()]).finally(() => {
            setIsDataLoaded(true);
        });

        // Listen for group creation notifications
        const onGroupCreated = (data) => {
            const { group, createdBy } = data;
            const myId = userRef.current?.id || userRef.current?._id;
            setGroups(prev => {
                const exists = prev.find(g => g._id === group._id);
                if (exists) return prev;
                return [{ ...group, isGroup: true }, ...prev];
            });
            // Show snackbar to members who did NOT create the group
            if (String(createdBy) !== String(myId)) {
                const groupName = group.name || 'Unnamed Group';
                setSnackbar({
                    senderName: groupName,
                    senderAvatar: group.icon || null,
                    message: `You were added to "${groupName}"`,
                    type: 'info',
                    variant: 'system' // Matching picture 3 style
                });
            }
        };
        socket.on('group_created', onGroupCreated);

        // Listen for new group messages
        const onGroupMessage = (data) => {
            const currentSelectedGroup = selectedGroupRef?.current;
            const isCurrentGroup = currentSelectedGroup && String(currentSelectedGroup._id) === String(data.groupId);

            if (isCurrentGroup) {
                setGroupMessages(prev => {
                    // Prevent duplicates
                    if (prev.find(m => m._id === data.message?._id)) return prev;
                    return [...prev, data.message];
                });
                setTimeout(scrollToBottom, 50);
            } else {
                // Show notification for group messages if not in that group
                const senderName = data.message.sender_id?.name || 'Group Member';
                const groupName = groups.find(g => g._id === data.groupId)?.name || 'Group';

                let previewText = data.message.content || 'Sent a message';
                if (data.message.type === 'image') previewText = '📷 Image';
                else if (data.message.type === 'file') previewText = '📄 File';

                setSnackbar({
                    senderName: `${senderName} @ ${groupName}`,
                    message: previewText,
                    type: 'info',
                    duration: 5000
                });
            }

            setGroups(prev => prev.map(g => {
                if (String(g._id) === String(data.groupId)) {
                    const newUnread = isCurrentGroup ? 0 : (g.unreadCount || 0) + 1;
                    return { ...g, lastMessage: data.message, unreadCount: newUnread };
                }
                return g;
            }));
        };
        socket.on('group_message', onGroupMessage);

        return () => {
            socket.off('group_created', onGroupCreated);
            socket.off('group_message', onGroupMessage);
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.io.off("reconnect_attempt", onReconnectAttempt);
            socket.io.off("reconnect_failed", onReconnectFailed);
            socket.off('receive_message', onReceiveMessage);
            socket.off('messages_read', onMessagesRead);
            socket.off('messages_unread', onMessagesUnread);
            socket.off('user_status_change', onStatusChange);
            socket.off('message_deleted', onMessageDeleted);
            socket.off('force_logout', onForceLogout);
            if (socket.connected) socket.disconnect();
        };
    }, [user.id, navigate]);

    // Consolidated outside listeners for dropdowns, menus and Escape key
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openDropdown) setOpenDropdown(null);
            if (chatContextMenu) setChatContextMenu(null);
            if (showMenu) setShowMenu(false);
            // NOTE: isStarredMenuOpen is handled by its own dedicated mousedown listener
            // to avoid closing on the same click that opens it.
            if (isCountryDropdownOpen) setIsCountryDropdownOpen(false);
        };

        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (chatContextMenu) {
                    setChatContextMenu(null);
                } else if (openDropdown) {
                    setOpenDropdown(null);
                } else if (showMenu) {
                    setShowMenu(false);
                } else if (isNewGroupOpen) {
                    setIsNewGroupOpen(false);
                } else if (isNewChatOpen) {
                    setIsNewChatOpen(false);
                } else if (selectedUser) {
                    setSelectedUser(null);
                    // Also cleanup selection modes
                    setIsForwardingMode(false);
                    setIsChatSelectionMode(false);
                    setForwardSelectedMsgs([]);
                }
            }

            // --- Synchronized Zoom Shortcuts ---
            // Support standard browser shortcuts (Ctrl + =/-)
            // We DON'T e.preventDefault() for native keys, so the browser zooms natively, 
            // and our 'resize' listener handles the label sync.
            if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === '-')) {
                // Let browser handle native zoom
                return;
            }

            // Custom shortcuts for cycling (Ctrl + / or Ctrl + ,)
            if (e.ctrlKey && (e.key === '/' || e.key === ',')) {
                e.preventDefault();
                const currentIndex = fontSizesArr.indexOf(selectedFontSize);
                const nextIndex = (currentIndex + 1) % fontSizesArr.length;
                const newSize = fontSizesArr[nextIndex];
                handleFontSizeChange(newSize);
                setSnackbar({ message: `Zoom: ${newSize}`, type: 'info', variant: 'system' });
            }
            // Ctrl + Shift + / (Ctrl + ?) or Ctrl + Shift + , (Ctrl + <) to decrease
            if (e.ctrlKey && e.shiftKey && (e.key === '?' || e.key === '<')) {
                e.preventDefault();
                const currentIndex = fontSizesArr.indexOf(selectedFontSize);
                const prevIndex = (currentIndex - 1 + fontSizesArr.length) % fontSizesArr.length;
                const newSize = fontSizesArr[prevIndex];
                handleFontSizeChange(newSize);
                setSnackbar({ message: `Zoom: ${newSize}`, type: 'info', variant: 'system' });
            }
        };

        window.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [openDropdown, chatContextMenu, showMenu, isCountryDropdownOpen, selectedUser, isNewChatOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (starredMenuRef.current && !starredMenuRef.current.contains(e.target)) {
                setIsStarredMenuOpen(false);
            }
            if (globalStarredMenuRef.current && !globalStarredMenuRef.current.contains(e.target)) {
                setIsGlobalStarredMenuOpen(false);
            }
        };
        if (isStarredMenuOpen || isGlobalStarredMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStarredMenuOpen, isGlobalStarredMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (groupIconMenuRef.current && !groupIconMenuRef.current.contains(e.target)) {
                setIsGroupIconMenuOpen(false);
            }
        };
        if (isGroupIconMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isGroupIconMenuOpen]);

    useEffect(() => {
        const filtersEl = filtersRef.current;
        if (!filtersEl) return;

        const handleWheel = (e) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            filtersEl.scrollLeft += e.deltaY;
        };

        filtersEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => filtersEl.removeEventListener('wheel', handleWheel);
    }, []);

    // --- Fetch Global Starred Messages ---
    const fetchGlobalStarredMessages = async () => {
        setIsGlobalStarredLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/chat/messages/starred/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGlobalStarredMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch global starred messages", err);
        } finally {
            setIsGlobalStarredLoading(false);
        }
    };

    // Trigger fetch when global starred panel opens
    useEffect(() => {
        if (isGlobalStarredOpen) {
            fetchGlobalStarredMessages();
        }
    }, [isGlobalStarredOpen]);

    // --- Fetch Current User Data (For Profile) ---
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await axios.get('/api/chat/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setUserData(res.data);
            } catch (err) {
                console.error("Failed to fetch my profile", err);
            }
        };

        fetchMe(); // Fetch once on mount
        if (isProfileOpen) {
            fetchMe(); // Also fetch when opening profile to ensure it's fresh
        }
    }, [isProfileOpen, isContactInfoOpen]); // trigger when profile or contact info opens


    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/groups/my-groups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGroups(res.data || []);
        } catch (err) {
            console.error('fetchGroups error:', err);
        }
    };

    const fetchGroupMessages = async (groupId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/groups/${groupId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGroupMessages(res.data || []);
        } catch (err) {
            console.error('fetchGroupMessages error:', err);
        }
    };

    const createGroup = async () => {
        try {
            const token = localStorage.getItem('token');
            const memberIds = selectedGroupMembers.map(m => m._id);
            const res = await axios.post('/api/groups/create', {
                name: groupSubject.trim(),
                icon: groupIcon || null,
                memberIds,
                permissions: groupPerms
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const newGroup = { ...res.data.group, isGroup: true };
            setGroups(prev => [newGroup, ...prev]);
            // Close drawer and reset all state
            setIsNewGroupOpen(false);
            setSelectedGroupMembers([]);
            setNewGroupStep(1);
            setGroupSubject('');
            setGroupIcon(null);
            // Open the group chat
            setSelectedGroup(newGroup);
            setSelectedUser(null);
            fetchGroupMessages(newGroup._id);
            setSnackbar({ message: 'Group created!', type: 'success', variant: 'system' });
        } catch (err) {
            console.error('createGroup error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to create group';
            setSnackbar({ message: errorMsg, type: 'error', variant: 'system' });
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/chat/users?currentUserId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!Array.isArray(res.data)) {
                console.error("fetchUsers: Expected array but got", typeof res.data, res.data);
                return;
            }
            const filteredUsers = res.data.filter(u => u.role !== 'admin');

            // Get Pinned & Muted Chats
            const pinnedKey = `pinnedChats_${user.id}`;
            const mutedKey = `mutedChats_${user.id}`;
            const pinnedIds = JSON.parse(localStorage.getItem(pinnedKey)) || [];
            const mutedMap = JSON.parse(localStorage.getItem(mutedKey)) || {};

            const now = Date.now();

            // Process users with Pin & Mute status
            const processedUsers = filteredUsers.map(u => {
                let isMuted = false;
                const muteUntil = mutedMap[u._id]; // Timestamp or 'Always'

                if (muteUntil === 'Always') {
                    isMuted = true;
                } else if (muteUntil && now < muteUntil) {
                    isMuted = true;
                }

                return {
                    ...u,
                    isPinned: pinnedIds.includes(u._id),
                    isMuted,
                    muteUntil
                };
            });

            // Sort: Pinned first, then by last message time (descending)
            const sortedUsers = processedUsers.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;

                const timeA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at) : 0;
                const timeB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at) : 0;
                return timeB - timeA;
            });

            setUsers(sortedUsers);

            isInitialFetchDone.current = true;
        } catch (err) {
            console.error(err);
        }

    };

    // --- Sync Selected User with Users List ---
    useEffect(() => {
        if (selectedUser) {
            const updatedUser = users.find(u => u._id === selectedUser._id);
            // Only update if data changed to avoid loops
            if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(selectedUser)) {
                setSelectedUser(updatedUser);
            }
        }
    }, [users]);

    // --- Fetch Data on Panel Open ---
    useEffect(() => {
        if (isContactInfoOpen) {
            fetchUsers();
        }
    }, [isContactInfoOpen]);

    const handleTogglePinChat = (contactId) => {
        const pinnedKey = `pinnedChats_${user.id}`;
        let pinnedIds = JSON.parse(localStorage.getItem(pinnedKey)) || [];

        if (pinnedIds.includes(contactId)) {
            // Unpin
            pinnedIds = pinnedIds.filter(id => id !== contactId);
        } else {
            // Pin
            if (pinnedIds.length >= 4) {
                setSnackbar({ message: 'You can only pin up to 4 chats', type: 'error' });
                return;
            }
            pinnedIds.push(contactId);
        }

        localStorage.setItem(pinnedKey, JSON.stringify(pinnedIds));

        // Update local state immediately for both
        setUsers(prev => prev.map(u => u._id === contactId ? { ...u, isPinned: pinnedIds.includes(contactId) } : u));
        setGroups(prev => prev.map(g => g._id === contactId ? { ...g, isPinned: pinnedIds.includes(contactId) } : g));

        fetchUsers(); // Refresh list to reflect order
        fetchGroups();
        setOpenDropdown(null);
    };

    const markAsRead = async (senderId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/chat/messages/mark-read',
                { userId: user.id, senderId: senderId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setUsers(prev => prev.map(u => u._id === senderId ? { ...u, unreadCount: 0 } : u));
        } catch (err) { console.error(err); }
    };

    const fetchP2PRequest = async (otherId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/chat/p2p/${user.id}/${otherId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessages(res.data);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) { console.error(err); }
    };

    const handleUserSelect = (u) => {
        if (!selectedUser || selectedUser._id !== u._id) {
            setInput('');
            setFile(null);
            setTypingLinkPreview(null);
            setReplyingTo(null);
            setIsChatSelectionMode(false);
            setIsForwardingMode(false);
            setForwardSelectedMsgs([]);
            setInfoMessage(null);
            setIsContactInfoOpen(false);
            setIsMessageSearchOpen(false);
            setIsStarredMessagesOpen(false);
            setIsSharedMediaOpen(false);
            setIsEditContactOpen(false);
            setShowScrollBtn(false);
        }
        setSelectedUser(u);
        fetchP2PRequest(u._id);
        if (u.unreadCount > 0) markAsRead(u._id);
    };

    const handleToggleStar = async (msgId, currentState) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/chat/message/${msgId}/toggle`,
                { action: 'star', value: !currentState },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setMessages(prev => prev.map(m => m._id === msgId ? { ...m, is_starred: !currentState } : m));
            setGroupMessages(prev => prev.map(m => m._id === msgId ? { ...m, is_starred: !currentState } : m));
            setSnackbar({ message: `Message ${!currentState ? 'starred' : 'unstarred'}`, type: 'success', variant: 'system' });
            setOpenDropdown(null);
        } catch (err) { console.error("Star toggle failed", err); }
    };

    const handleToggleFavorite = async (targetId, isFav) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/chat/toggle-favorite',
                { targetUserId: targetId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setUsers(prev => prev.map(u => u._id === targetId ? { ...u, isFavorite: !isFav } : u));
            setGroups(prev => prev.map(g => g._id === targetId ? { ...g, isFavorite: !isFav } : g));

            const isGroup = groups.some(g => g._id === targetId);
            setSnackbar({ message: `${isGroup ? 'Group' : 'User'} ${!isFav ? 'added to favorites' : 'removed from favorites'}`, type: 'success', variant: 'system' });
            setOpenDropdown(null);
        } catch (err) { console.error("Favorite toggle failed", err); }
    };

    const handleMarkAsUnread = async (targetId) => {
        try {
            const isGroup = groups.some(g => g._id === targetId);
            if (isGroup) {
                const groupObj = groups.find(g => g._id === targetId);
                const myId = user.id || user._id;
                const lastMsgSender = groupObj?.lastMessage?.sender_id?._id || groupObj?.lastMessage?.sender_id;

                if (!groupObj?.lastMessage || String(lastMsgSender) === String(myId)) {
                    setSnackbar({ message: 'No messages to Mark as Unread identified', type: 'info', variant: 'system' });
                    setOpenDropdown(null);
                    return;
                }

                setGroups(prev => prev.map(g => g._id === targetId ? { ...g, unreadCount: (g.unreadCount || 0) + 1 } : g));
                setSnackbar({ message: 'Marked as unread', type: 'success', variant: 'system' });
            } else {
                const token = localStorage.getItem('token');
                const res = await axios.post('/api/chat/messages/mark-unread',
                    { userId: user.id || user._id, targetUserId: targetId },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                socket.emit('mark_unread', { targetUserId: targetId, userId: user.id || user._id });
                await fetchUsers();

                if (res.data.modifiedCount > 0) {
                    setSnackbar({ message: 'Marked as unread', type: 'success', variant: 'system' });
                } else {
                    setSnackbar({ message: 'No messages to Mark as Unread identified', type: 'info', variant: 'system' });
                }
            }
            setOpenDropdown(null);
        } catch (err) { console.error("Mark as unread failed", err); }
    };

    const handleArchiveChat = (id, displayName) => {
        setArchivedChatIds(prev => [...new Set([...prev, id])]);
        setOpenDropdown(null);
        setSnackbar({
            message: `Chat ${displayName} is archived`,
            type: 'success',
            variant: 'system',
            onAction: () => handleUnarchiveChat(id, displayName),
            actionLabel: 'Undo',
            duration: 4000
        });

        // Close chat if it was open
        if ((selectedUser && selectedUser._id === id) || (selectedGroup && selectedGroup._id === id)) {
            handleBackToChatList();
        }
    };

    const handleUnarchiveChat = (id, displayName) => {
        setArchivedChatIds(prev => prev.filter(cid => cid !== id));
        setOpenDropdown(null);
        setSnackbar({
            message: `Chat ${displayName} is unarchived`,
            type: 'success',
            variant: 'system',
            onAction: () => handleArchiveChat(id, displayName),
            actionLabel: 'Undo'
        });
    };

    // --- Mute Handlers ---
    const handleMuteAction = () => {
        if (!muteTargetUser) return;

        const mutedKey = `mutedChats_${user.id}`;
        const mutedMap = JSON.parse(localStorage.getItem(mutedKey)) || {};

        let muteUntil;
        if (muteDuration === '8 hours') {
            muteUntil = Date.now() + (8 * 60 * 60 * 1000);
        } else if (muteDuration === '1 week') {
            muteUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
        } else {
            muteUntil = 'Always';
        }

        mutedMap[muteTargetUser.id] = muteUntil;
        localStorage.setItem(mutedKey, JSON.stringify(mutedMap));

        setIsMuteModalOpen(false);
        fetchUsers();

        setSnackbar({
            message: `Chat ${muteTargetUser.name} is muted`,
            type: 'info',
            variant: 'system',
            action: {
                label: 'Undo',
                onClick: () => handleUnmuteAction(muteTargetUser.id, muteTargetUser.name)
            }
        });
    };

    const handleUnmuteAction = (targetId, name) => {
        const mutedKey = `mutedChats_${user.id}`;
        const mutedMap = JSON.parse(localStorage.getItem(mutedKey)) || {};

        delete mutedMap[targetId];
        localStorage.setItem(mutedKey, JSON.stringify(mutedMap));

        fetchUsers();
        setSnackbar({ message: `Notifications unmuted for ${name}`, type: 'success', variant: 'system' });
        setOpenDropdown(null);
    };


    const handleDeleteClick = (msgId) => {
        setMsgToDelete(msgId);
        setIsDeleteModalOpen(true);
        setOpenDropdown(null);
    };

    const confirmDelete = () => {
        if (msgToDelete) {
            if (Array.isArray(msgToDelete)) {
                handleBulkDeleteMessage(msgToDelete);
            } else {
                handleDeleteMessage(msgToDelete, deleteOption);
            }
        }
        setIsDeleteModalOpen(false);
        setMsgToDelete(null);
        setDeleteOption('me'); // Reset to default
    };

    const handleBulkDeleteMessage = async (ids, deleteOption = 'me') => {
        try {
            const validIds = ids.filter(id => id && String(id).length === 24);
            if (validIds.length === 0) {
                setSnackbar({ message: "No permanently saved messages selected", type: 'info' });
                return;
            }

            const token = localStorage.getItem('token');
            const res = await axios.post('/api/chat/messages/bulk-delete', {
                messageIds: validIds,
                deleteFor: deleteOption // Send 'me' or 'everyone' to backend
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.status === 'success') {
                const currentUserId = user.id || user._id;
                const results = res.data.results || [];

                setMessages(prev => {
                    let updatedMsgs = [...prev];
                    results.forEach(resMsg => {
                        const mId = String(resMsg.messageId);
                        const isDeletedForMe = resMsg.deleted_for && resMsg.deleted_for.some(id => String(id) === String(currentUserId));

                        if (isDeletedForMe) {
                            updatedMsgs = updatedMsgs.filter(m => String(m._id) !== mId && String(m.id) !== mId);
                        } else {
                            updatedMsgs = updatedMsgs.map(m =>
                                (String(m._id) === mId || String(m.id) === mId)
                                    ? { ...m, is_deleted_by_admin: resMsg.is_deleted_by_admin, is_deleted_by_user: resMsg.is_deleted_by_user }
                                    : m
                            );
                        }
                    });
                    return updatedMsgs;
                });

                setGroupMessages(prev => {
                    let updatedMsgs = [...prev];
                    results.forEach(resMsg => {
                        const mId = String(resMsg.messageId);
                        const isDeletedForMe = resMsg.deleted_for && resMsg.deleted_for.some(id => String(id) === String(currentUserId));
                        if (isDeletedForMe) {
                            updatedMsgs = updatedMsgs.filter(m => String(m._id) !== mId && String(m.id) !== mId);
                        } else {
                            updatedMsgs = updatedMsgs.map(m =>
                                (String(m._id) === mId || String(m.id) === mId)
                                    ? { ...m, is_deleted_by_admin: resMsg.is_deleted_by_admin, is_deleted_by_user: resMsg.is_deleted_by_user }
                                    : m
                            );
                        }
                    });
                    return updatedMsgs;
                });

                setSnackbar({
                    message: deleteOption === 'everyone' ? 'Messages deleted for everyone' : 'Messages deleted',
                    type: 'success',
                    variant: 'system'
                });

                // Reset selection modes if active
                if (isForwardingMode) {
                    setIsForwardingMode(false);
                    setIsChatSelectionMode(false);
                    setForwardSelectedMsgs([]);
                }
                if (selectedMediaMsgs.length > 0) {
                    setSelectedMediaMsgs([]);
                }
            } else {
                setSnackbar({ message: 'Failed to delete messages', type: 'error', variant: 'system' });
            }
        } catch (err) {
            console.error("Bulk delete failed", err);
            setSnackbar({ message: 'Error deleting messages', type: 'error', variant: 'system' });
        }
    };

    const handleDeleteMessage = async (msgId, deleteOption = 'me') => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/chat/message/${msgId}/delete`, {
                deleteFor: deleteOption // Send 'me' or 'everyone' to backend
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.status === 'success') {
                const currentUserId = user.id || user._id;
                const isDeletedForMe = res.data.deleted_for && res.data.deleted_for.some(id => String(id) === String(currentUserId));

                if (isDeletedForMe) {
                    setMessages(prev => prev.filter(msg => msg._id !== msgId && msg.id !== msgId));
                } else {
                    setMessages(prev => prev.map(msg =>
                        (msg._id === msgId || msg.id === msgId)
                            ? { ...msg, is_deleted_by_admin: res.data.is_deleted_by_admin, is_deleted_by_user: res.data.is_deleted_by_user }
                            : msg
                    ));
                    setGroupMessages(prev => prev.map(msg =>
                        (msg._id === msgId || msg.id === msgId)
                            ? { ...msg, is_deleted_by_admin: res.data.is_deleted_by_admin, is_deleted_by_user: res.data.is_deleted_by_user }
                            : msg
                    ));
                }
                setSnackbar({ message: deleteOption === 'everyone' ? 'Message deleted for everyone' : 'Message deleted', type: 'success', variant: 'system' });
            }
        } catch (err) {
            console.error("Delete failed", err);
            setSnackbar({ message: 'Delete failed', type: 'error', variant: 'system' });
        }
    };

    const handleUnstarAllRequest = () => {
        setIsStarredMenuOpen(false);
        setUnstarTarget('current');
        setIsUnstarConfirmOpen(true);
    };

    const handleGlobalUnstarAllRequest = () => {
        setIsGlobalStarredMenuOpen(false);
        setUnstarTarget('global');
        setIsUnstarConfirmOpen(true);
    };

    const confirmUnstarAll = async () => {
        const targetMsgs = unstarTarget === 'global' ? globalStarredMessages : messages.filter(m => m.is_starred);
        if (targetMsgs.length === 0) {
            setIsUnstarConfirmOpen(false);
            return;
        }

        const token = localStorage.getItem('token');
        try {
            await Promise.all(targetMsgs.map(m => {
                const endpoint = m.isGroup ? `/api/groups/message/${m._id || m.id}/toggle` : `/api/chat/message/${m._id || m.id}/toggle`;
                return axios.post(endpoint, {
                    action: 'star',
                    value: false
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }));

            if (unstarTarget === 'global') {
                setGlobalStarredMessages([]);
                // Also update local current chat messages if any of them were unstarred
                setMessages(prev => prev.map(m => ({ ...m, is_starred: false })));
                setGroupMessages(prev => prev.map(m => ({ ...m, is_starred: false })));
            } else {
                setMessages(prev => prev.map(m => ({ ...m, is_starred: false })));
                // Also update global list if it's loaded
                setGlobalStarredMessages(prev => prev.filter(m => !targetMsgs.some(tm => String(tm._id) === String(m._id))));
            }
            setSnackbar({ message: "Messages unstarred", type: 'success', variant: 'system' });
            setIsUnstarConfirmOpen(false);
        } catch (err) {
            console.error("Unstar all failed", err);
            setSnackbar({ message: "Failed to unstar messages", type: 'error', variant: 'system' });
            setIsUnstarConfirmOpen(false);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'mp4', 'avi', 'mkv', 'mov', 'webm'];
            const extension = selectedFile.name.split('.').pop().toLowerCase();

            if (allowedExtensions.includes(extension)) {
                if (selectedFile.size > 1073741824) { // 1GB
                    setSnackbar({ message: 'File must be less than 1GB', type: 'error', variant: 'system' });
                    e.target.value = '';
                } else {
                    setFile(selectedFile);
                }
            } else {
                setSnackbar({ message: 'Only JPG, JPEG, PNG, DOC, DOCX, PDF, Excel, and Video files are allowed.', type: 'error', variant: 'system' });
                e.target.value = ''; // Reset input
            }
        }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if ((!input.trim() && !file) || !selectedUser) return;

        // Optimistic UI Update (Temporary)
        const tempId = Date.now();
        const tempMsg = {
            id: tempId,
            sender_id: user.id || user._id,
            receiver_id: selectedUser._id,
            role: 'user',
            content: input,
            type: file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text',
            file_path: file ? URL.createObjectURL(file) : null, // Local preview
            fileName: file ? file.name : null,
            fileSize: file ? file.size : null,
            pageCount: 1, // Default for optimistic UI
            created_at: new Date(),
            is_read: false,
            reply_to: replyingTo // Store full object for rendering preview
        };

        setMessages(prev => [...prev, tempMsg]);
        setInput('');
        setFile(null); // Clear file immediately from UI
        setReplyingTo(null); // Clear reply context immediately
        setTypingLinkPreview(null); // Clear typing preview immediately

        try {
            const formData = new FormData();
            formData.append('userId', user.id || user._id);
            formData.append('toUserId', selectedUser._id);
            formData.append('content', input);
            if (file) formData.append('file', file);
            if (tempMsg.reply_to) {
                formData.append('reply_to', tempMsg.reply_to._id);
            }

            // Ensure socket is connected before potential emit
            if (!socket.connected) {
                console.warn('Socket disconnected. Attempting reconnect before send...');
                socket.connect();
            }

            // Upload to Server
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/chat/send', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            const sentMsg = res.data.message;

            // UPDATE LOCAL STATE WITH REAL MESSAGE (including link_preview)
            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...sentMsg, reply_to: tempMsg.reply_to } : msg
            ));

            // critically: EMIT SOCKET NOW with the REAL server file_path and reply context
            socket.emit('send_message', {
                _id: sentMsg._id, // Pass server ID
                sender_id: user.id || user._id,
                receiverId: selectedUser._id,
                content: sentMsg.content,
                type: sentMsg.type,
                file_path: sentMsg.file_path,
                reply_to: tempMsg.reply_to // Pass full reply object if needed by client, or just ID
            });

            // Update Contact List (Move to top, update last message)
            fetchUsers(); // Force refresh contact list from server

        } catch (err) {
            console.error("Failed to send msg", err);
            // Ideally remove temp message or show error
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('lastActiveChat'); // Clear active chat state
        window.dispatchEvent(new Event('authChange'));
        window.location.href = '/';
    };

    const saveProfileField = async (field) => {
        try {
            const token = localStorage.getItem('token');
            const data = { targetUserId: user.id || user._id };
            if (field === 'name') data.name = profileEditValue;
            if (field === 'mobile') {
                const cleanMobile = profileEditValue.replace(/\D/g, '');
                if (cleanMobile.length !== 10) {
                    setSnackbar({ message: 'Error: Mobile number must be exactly 10 digits', type: 'error' });
                    return;
                }
                data.mobile = cleanMobile;
            }
            if (field === 'about') data.about = profileEditValue;

            const res = await axios.post('/api/chat/user/update', data, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const updatedUser = { ...userData };
            if (field === 'name') {
                updatedUser.name = profileEditValue;
                setIsEditingProfileName(false);
            }
            if (field === 'mobile') {
                updatedUser.mobile = profileEditValue;
                setIsEditingProfilePhone(false);
            }
            if (field === 'about') {
                updatedUser.about = profileEditValue;
                setIsEditingProfileAbout(false);
            }

            setUserData(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setSnackbar({ message: 'Profile Updated successfully', type: 'success', variant: 'system' });
        } catch (err) {
            console.error("Failed to update profile", err);
            setSnackbar({ message: 'Update failed', type: 'error' });
        }
    };

    const handleNotificationReply = async (text, targetUserId) => {
        if (!text.trim() || !targetUserId) return;

        const currentUser = userRef.current;
        if (!currentUser || (!currentUser.id && !currentUser._id)) {
            console.error("[DEBUG] handleNotificationReply: User not authenticated or stale state. Current User:", currentUser);
            setSnackbar({ message: 'Authentication error', type: 'error' });
            return;
        }

        const senderId = currentUser.id || currentUser._id;
        console.log(`[DEBUG] handleNotificationReply: Sending reply. Text: "${text}", To: ${targetUserId}, From: ${senderId}`);
        console.log(`[DEBUG] handleNotificationReply: Current Selected Chat: ${selectedUserRef.current?._id}`);

        // Construct simplified message object
        const tempId = 'temp-' + Date.now();
        const replyMsg = {
            _id: tempId,
            sender_id: senderId,
            receiver_id: targetUserId,
            role: 'user',
            content: text,
            type: 'text',
            created_at: new Date(),
            is_read: false
        };

        // Update UI if we are in the chat with the target user
        const isChatOpenWithTarget = selectedUserRef.current && String(selectedUserRef.current._id) === String(targetUserId);
        console.log(`[DEBUG] handleNotificationReply: Is chat open with target? ${isChatOpenWithTarget}`);

        if (isChatOpenWithTarget) {
            setMessages(prev => [...prev, replyMsg]);
        }

        try {
            console.log('[DEBUG] Emitting send_message socket event...');
            const socketData = {
                senderId: senderId,
                receiverId: targetUserId,
                content: text,
                type: 'text',
                created_at: new Date().toISOString(),
                reply_to: null // Notifications replies are direct
            };
            socket.emit('send_message', socketData);

            const formData = new FormData();
            formData.append('userId', senderId);
            formData.append('toUserId', targetUserId);
            formData.append('content', text);
            formData.append('reply_to', ''); // Explicitly empty for notification reply

            console.log('[DEBUG] Posting message to API...');
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/chat/send', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Update local message with real server ID once received
            const stillOpenWithTarget = selectedUserRef.current && String(selectedUserRef.current._id) === String(targetUserId);
            if (stillOpenWithTarget && res.data.message) {
                setMessages(prev => prev.map(m => m._id === tempId ? { ...res.data.message, role: 'user' } : m));
            }
        } catch (err) {
            console.error('[DEBUG] handleNotificationReply: Error sending message:', err);
            setSnackbar({ message: 'Failed to send reply', type: 'error' });
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            setCameraModal('active');
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Camera access error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraModal('blocked');
            } else {
                setSnackbar({ message: "Camera not available: " + err.message, type: 'error' });
            }
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setCameraModal('none');
    };

    const handleCameraAction = async () => {
        setIsGroupIconMenuOpen(false);

        // If already blocked, show blocked screen directly
        if (cameraModal === 'blocked') {
            setCameraModal('blocked');
            return;
        }

        // Check if camera permission is already granted using Permissions API
        try {
            if (navigator.permissions) {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                if (permissionStatus.state === 'granted') {
                    // Permission already granted — skip the dialog and open camera directly
                    startCamera();
                    return;
                } else if (permissionStatus.state === 'denied') {
                    // Permission permanently denied
                    setCameraModal('blocked');
                    return;
                }
            }
        } catch (err) {
            // Permissions API not supported in this browser — fall through to permission screen
            console.log('Permissions API not available, showing permission modal');
        }

        // Default: show the permission request screen
        setCameraModal('permission');
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0);

            setCapturedImage(canvas.toDataURL('image/png'));
            setCameraModal('adjust');
            setImageScale(1);
            setImagePos({ x: 0, y: 0 });

            // Stop camera stream once captured
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                setCameraStream(null);
            }
        }
    };

    const handleImageDragStart = (e) => {
        setIsDraggingImage(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - imagePos.x, y: clientY - imagePos.y });
    };

    const handleImageDragMove = (e) => {
        if (!isDraggingImage) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setImagePos({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        });
    };

    const handleImageDragEnd = () => {
        setIsDraggingImage(false);
    };

    const handleZoom = (dir) => {
        setImageScale(prev => {
            const factor = dir === 'in' ? 1.1 : 0.9;
            const next = prev * factor;
            return Math.max(0.5, Math.min(5, next));
        });
    };

    const handleConfirmPhoto = () => {
        try {
            // Create a canvas to perform the crop
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const cropSize = 380; // Size of our wa-crop-circle
            canvas.width = cropSize;
            canvas.height = cropSize;

            const img = new Image();
            img.onload = () => {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Save state for clipping to circle
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
                    ctx.clip();

                    // Draw image with transforms
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;

                    ctx.translate(centerX + imagePos.x, centerY + imagePos.y);
                    ctx.scale(imageScale, imageScale);

                    // Draw original captured image centered
                    const drawWidth = img.width;
                    const drawHeight = img.height;
                    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2);

                    ctx.restore();

                    const croppedDataUrl = canvas.toDataURL('image/png');
                    setGroupIcon(croppedDataUrl);
                } catch (innerErr) {
                    console.error("Cropping inner error:", innerErr);
                    setGroupIcon(capturedImage); // Fallback to uncropped image
                } finally {
                    closeCamera();
                    setSnackbar({ message: "Group icon updated!", type: 'success', variant: 'system' });
                }
            };
            img.onerror = () => {
                console.error("Image load error");
                setGroupIcon(capturedImage);
                closeCamera();
                setSnackbar({ message: "Group icon updated!", type: 'success', variant: 'system' });
            };
            img.src = capturedImage;
        } catch (err) {
            console.error("Cropping setup error:", err);
            setGroupIcon(capturedImage);
            closeCamera();
            setSnackbar({ message: "Group icon updated!", type: 'success', variant: 'system' });
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderUserStatus = (u) => {
        if (!u) return '';
        if (u.isOnline) return t('chat_window.online');
        if (!u.lastSeen) return t('chat_window.click_for_info');

        const lastSeenDate = new Date(u.lastSeen);
        const now = new Date();

        const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);

        const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

        if (isSameDay(lastSeenDate, now)) {
            return t('chat_window.last_seen_today', { time: timeStr });
        } else if (isSameDay(lastSeenDate, yesterday)) {
            return t('chat_window.last_seen_yesterday', { time: timeStr });
        } else {
            const dateStr = lastSeenDate.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
            return t('chat_window.last_seen_on', { date: dateStr, time: timeStr });
        }
    };

    // --- Sub Render Functions ---

    // --- Sub Render Functions ---

    const renderLeftSidebar = () => (
        <div className="wa-nav-sidebar">
            <div className="wa-nav-top">
                <button
                    className={`wa-nav-icon-btn ${(!isProfileOpen && !isSettingsOpen) ? 'active' : ''}`}
                    onClick={() => {
                        setIsProfileOpen(false);
                        setIsSettingsOpen(false);
                    }}
                    title={t('sidebar.chats')}
                >
                    <MessageSquare size={24} />
                    {/* Optional: Add red dot for total unread */}
                </button>
                <button className="wa-nav-icon-btn" title={t('sidebar.status')}><CircleDashed size={24} /></button>
                <button className="wa-nav-icon-btn" title={t('sidebar.channels')}><Users size={24} /></button>
                <button className="wa-nav-icon-btn" title={t('sidebar.communities')}><Users size={24} /></button>
            </div>
            <div className="wa-nav-bottom">
                <button
                    className={`wa-nav-icon-btn ${isSettingsOpen ? 'active' : ''}`}
                    title={t('sidebar.settings')}
                    onClick={() => {
                        setIsSettingsOpen(true);
                        setIsProfileOpen(false);
                    }}
                >
                    <Settings size={24} />
                </button>
                <button
                    className={`wa-nav-icon-btn wa-profile-btn ${isProfileOpen ? 'active' : ''}`}
                    onClick={() => {
                        setIsProfileOpen(true);
                        setIsSettingsOpen(false);
                    }}
                    title={t('sidebar.profile')}
                >
                    {/* User Profile Image as Icon */}
                    {userData.image ? (
                        <img src={userData.image} alt="Me" />
                    ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#ccc' }} />
                    )}
                </button>
            </div>
        </div>
    );

    const renderProfileDrawer = () => (
        <div className={`wa-profile-drawer ${isProfileOpen ? 'active' : ''}`}>
            <div className="wa-drawer-header" style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'white', borderBottom: 'none' }}>

                <span style={{
                    position: 'absolute',
                    left: 16,
                    textAlign: 'left',
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#3b4a54',
                    pointerEvents: 'none'
                }}>
                    {t('profile_drawer.title')}
                </span>
            </div>
            {/* Continuous White Content Area */}
            <div className="wa-drawer-content" style={{ background: 'white', overflowY: 'auto' }}>

                {/* Profile Pic - Centered */}
                <div className="wa-profile-pic-section" style={{ background: 'white', padding: '40px 0 30px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: 160, height: 160 }}>
                        {userData.image ? (
                            <img src={userData.image} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#dfe1e5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <UserIcon size={80} color="#fff" />
                            </div>
                        )}

                    </div>
                </div>

                {/* Name Section */}
                <div className="wa-profile-row" style={{ padding: '14px 30px', display: 'flex', alignItems: 'flex-start', gap: 20 }}>

                    <div style={{ flex: 1 }}>
                        <div className="wa-section-label" style={{ color: '#54656f', fontSize: 13, marginBottom: 4 }}>{t('profile_drawer.name_label')}</div>
                        <div className="wa-section-value-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}>
                            {isEditingProfileName ? (
                                <div style={{ borderBottom: '2px solid #027EB5', flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <input
                                        autoFocus
                                        className="wa-profile-edit-input"
                                        value={profileEditValue}
                                        onChange={(e) => setProfileEditValue(e.target.value)}
                                        style={{ border: 'none', outline: 'none', fontSize: 17, color: '#111b21', width: '100%', padding: '8px 0' }}
                                        onKeyDown={(e) => e.key === 'Enter' && saveProfileField('name')}
                                    />
                                    <span style={{ fontSize: 12, color: '#8696a0' }}>{25 - profileEditValue.length}</span>
                                    <CheckCheck size={20} color="#8696a0" style={{ cursor: 'pointer', marginLeft: 10 }} onClick={() => saveProfileField('name')} />
                                </div>
                            ) : (
                                <>
                                    <span className="wa-section-value" style={{ fontSize: 17, color: '#111b21' }}>{userData.name}</span>
                                    <Pencil size={20} color="#8696a0" style={{ cursor: 'pointer' }} onClick={() => { setIsEditingProfileName(true); setProfileEditValue(userData.name || ""); }} />
                                </>
                            )}
                        </div>
                        {!isEditingProfileName && <div className="wa-section-note" style={{ fontSize: 13, color: '#8696a0', marginTop: 14 }}>{t('profile_drawer.name_desc')}</div>}
                    </div>
                </div>

                {/* About Section */}
                <div className="wa-profile-row" style={{ padding: '14px 30px', display: 'flex', alignItems: 'flex-start', gap: 20 }}>

                    <div style={{ flex: 1, borderTop: '1px solid #e9edef', paddingTop: 14 }}>
                        <div className="wa-section-label" style={{ color: '#54656f', fontSize: 13, marginBottom: 4 }}>{t('profile_drawer.about_label')}</div>
                        <div className="wa-section-value-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}>
                            {isEditingProfileAbout ? (
                                <div style={{ borderBottom: '2px solid #027EB5', flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <input
                                        autoFocus
                                        className="wa-profile-edit-input"
                                        value={profileEditValue}
                                        onChange={(e) => setProfileEditValue(e.target.value)}
                                        style={{ border: 'none', outline: 'none', fontSize: 17, color: '#111b21', width: '100%', padding: '8px 0' }}
                                        onKeyDown={(e) => e.key === 'Enter' && saveProfileField('about')}
                                    />
                                    <CheckCheck size={20} color="#8696a0" style={{ cursor: 'pointer', marginLeft: 10 }} onClick={() => saveProfileField('about')} />
                                </div>
                            ) : (
                                <>
                                    <span className="wa-section-value" style={{ fontSize: 17, color: '#111b21' }}>{userData.about || t('settings.profile.status_available')}</span>
                                    <Pencil size={20} color="#8696a0" style={{ cursor: 'pointer' }} onClick={() => { setIsEditingProfileAbout(true); setProfileEditValue(userData.about || "Available"); }} />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Phone Section */}
                <div className="wa-profile-row" style={{ padding: '14px 30px', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                    <div style={{ flex: 1, borderTop: '1px solid #e9edef', paddingTop: 14 }}>
                        <div className="wa-section-label" style={{ color: '#54656f', fontSize: 13, marginBottom: 4 }}>{t('profile_drawer.phone_label')}</div>
                        <div className="wa-section-value-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Phone size={20} color="#8696a0" fill="#8696a0" strokeWidth={0.1} style={{ marginRight: 30 }} />
                                <span className="wa-section-value" style={{ fontSize: 17, color: '#111b21' }}>{userData.mobile || userData.phone}</span>
                            </div>
                            {/* Copy Icon for Phone per Image 2 */}
                            <Copy size={20} color="#8696a0" style={{ cursor: 'pointer' }} onClick={() => {
                                navigator.clipboard.writeText(userData.mobile || userData.phone || '');
                                setSnackbar({ message: "Phone number copied", type: 'success', variant: 'system' });
                            }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNewChatDrawer = () => {
        // Sort users alphabetically
        const sortedUsers = [...users].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        // Group by letter
        const grouped = sortedUsers.reduce((acc, u) => {
            const letter = (u.name?.[0] || "#").toUpperCase();
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(u);
            return acc;
        }, {});

        const letters = Object.keys(grouped).sort();

        return (
            <div className={`wa-profile-drawer wa-new-chat-drawer ${isNewChatOpen ? 'active' : ''}`}>
                <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'white', borderBottom: '1px solid #e9edef', boxSizing: 'border-box', width: '100%' }}>
                    <button
                        onClick={() => setIsNewChatOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', marginRight: 10, display: 'flex', alignItems: 'center', width: 32, padding: 0, flexShrink: 0 }}
                    >
                        <X size={24} />
                    </button>
                    <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('new_chat.title')}</span>
                    <div style={{ flex: 1 }}></div>
                    <button
                        onClick={() => setIsPhoneNumberPanelOpen(true)}
                        style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center', width: 32, padding: 0, flexShrink: 0 }}
                    >
                        <LayoutGrid size={22} />
                    </button>
                </div>

                <div className="wa-drawer-content" style={{ background: 'white', overflowY: 'auto', flex: 1 }}>
                    {/* Search Bar */}
                    <div style={{ padding: '10px 16px' }}>
                        <div className="wa-search-bar" style={{ background: '#f0f2f5', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} color="#54656f" style={{ marginRight: 15 }} />
                            <input
                                type="text"
                                placeholder={t('new_chat.search_placeholder')}
                                style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 15 }}
                                value={newChatSearchQuery}
                                onChange={(e) => setNewChatSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Action Items */}
                    <div className="wa-new-chat-actions">
                        <div className="wa-new-chat-action-item" onClick={(e) => { e.stopPropagation(); setIsNewGroupOpen(true); setIsNewChatOpen(false); }}>
                            <div className="wa-action-icon-circle" style={{ background: '#027EB5' }}><Users size={20} color="white" /></div>
                            <span>{t('new_chat.new_group')}</span>
                        </div>


                        <div className="wa-new-chat-action-item">
                            <div className="wa-action-icon-circle" style={{ background: '#027EB5' }}><Users size={20} color="white" /></div>
                            <span>{t('new_chat.new_community')}</span>
                        </div>
                    </div>

                    <div style={{ padding: '15px 16px 10px', color: '#027EB5', fontSize: 13, fontWeight: 500 }}>
                        {t('new_chat.contacts_title')}
                    </div>

                    {/* Me Section */}
                    {user && (
                        <div className="wa-user-item" onClick={() => { setSelectedUser(user); setIsNewChatOpen(false); }}>
                            <div className="wa-avatar">
                                {user.image ? <img src={user.image} alt="You" /> : <span>{user.name?.charAt(0).toUpperCase()}</span>}
                            </div>
                            <div className="wa-user-info">
                                <div className="wa-user-name" style={{ fontWeight: 500 }}>{user.name} (You)</div>
                                <div className="wa-user-last-msg" style={{ fontSize: 13, color: '#667781' }}>Message yourself</div>
                            </div>
                        </div>
                    )}

                    {/* Grouped Contacts */}
                    {letters.map(letter => {
                        const filtered = grouped[letter].filter(u => u.name?.toLowerCase().includes(newChatSearchQuery.toLowerCase()));
                        if (filtered.length === 0) return null;

                        return (
                            <div key={letter} className="wa-contact-group">
                                <div style={{ padding: '15px 16px 5px', color: '#667781', fontSize: 14, fontWeight: 500 }}>{letter}</div>
                                {filtered.map(u => (
                                    <div key={u._id} className="wa-user-item" onClick={() => { setSelectedUser(u); setIsNewChatOpen(false); }}>
                                        <div className="wa-avatar">
                                            {u.image ? <img src={u.image} alt={u.name} /> : <span>{u.name?.charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div className="wa-user-info">
                                            <div className="wa-user-name" style={{ fontWeight: 500 }}>{u.name}</div>
                                            <div className="wa-user-last-msg" style={{ fontSize: 13, color: '#667781' }}>{u.about || t('settings.profile.status_available')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPhoneNumberPanel = () => {
        const handleNumberClick = (num) => {
            setPhoneNumberInput(prev => prev + num);
        };

        const handleBackspace = () => {
            setPhoneNumberInput(prev => prev.slice(0, -1));
        };

        // Search for contact matching the phone number
        // We clean both inputs to compare standard formats
        const cleanTyped = phoneNumberInput.replace(/\D/g, '');
        const matchingContact = cleanTyped.length > 0 ? users.find(u => {
            const cleanUserPhone = (u.mobile || u.phone || u.phoneNumber || '').replace(/\D/g, '');
            return cleanUserPhone.includes(cleanTyped);
        }) : null;

        return (
            <div className={`wa-profile-drawer wa-new-chat-drawer ${isPhoneNumberPanelOpen ? 'active' : ''}`}>
                {/* 1st Pic: Header with Back Arrow and "Phone number" */}
                <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'white', borderBottom: '1px solid #e9edef', boxSizing: 'border-box', width: '100%' }}>
                    <button
                        onClick={() => { setIsPhoneNumberPanelOpen(false); setPhoneNumberInput(''); }}
                        style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', marginRight: 10, display: 'flex', alignItems: 'center', width: 32, padding: 0, flexShrink: 0 }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap', flexShrink: 0 }}>Phone number</span>
                </div>

                <div className="wa-drawer-content" style={{ background: 'white', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Input area with Green Bottom Border - Always visible */}
                    <div style={{ padding: '20px 30px' }}>
                        <div style={{ borderBottom: '2px solid #027EB5', paddingBottom: '10px' }}>
                            <input
                                type="text"
                                value={phoneNumberInput}
                                readOnly
                                placeholder=""
                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 24, fontWeight: 'normal', background: 'transparent', color: '#111b21' }}
                            />
                        </div>
                    </div>

                    {/* 1st Pic: "Enter a phone number..." */}
                    {!phoneNumberInput && (
                        <div style={{ textAlign: 'center', color: '#8696a0', fontSize: 14, margin: '20px 30px' }}>
                            Enter a phone number to start a chat
                        </div>
                    )}

                    {/* 3rd Pic: Found Contact display */}
                    {phoneNumberInput && matchingContact && (
                        <div
                            className="wa-user-item"
                            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => {
                                // 4th Pic logic: Open chat and revert panel
                                handleUserSelect(matchingContact);
                                setIsPhoneNumberPanelOpen(false);
                                setPhoneNumberInput('');
                                // Also close New Chat drawer
                                setIsNewChatOpen(false);
                            }}
                        >
                            <div className="wa-avatar" style={{ marginRight: 15 }}>
                                {matchingContact.image ? (
                                    <img src={matchingContact.image} alt="" style={{ width: 45, height: 45, borderRadius: '50%' }} />
                                ) : (
                                    <div style={{ width: 45, height: 45, borderRadius: '50%', background: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={24} color="white" />
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#111b21', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {matchingContact.name || matchingContact.mobile || matchingContact.phone}
                                </div>
                                <div className="wa-user-last-msg" style={{ fontSize: 13, color: '#667781' }}>
                                    {matchingContact.about || 'Hey there! I am using WhatsApp.'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1 }}></div>

                    {/* 1st Pic: Dial Pad */}
                    <div style={{ padding: '0 40px 40px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px 20px', textAlign: 'center' }}>
                            {[
                                { n: '1', l: '' }, { n: '2', l: 'ABC' }, { n: '3', l: 'DEF' },
                                { n: '4', l: 'GHI' }, { n: '5', l: 'JKL' }, { n: '6', l: 'MNO' },
                                { n: '7', l: 'PQRS' }, { n: '8', l: 'TUV' }, { n: '9', l: 'WXYZ' },
                                { n: '+', l: '' }, { n: '0', l: '' }, { n: 'backspace', l: '' }
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        item.n === 'backspace' ? handleBackspace() : handleNumberClick(item.n);
                                    }}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ fontSize: 26, color: '#111b21' }}>
                                        {item.n === 'backspace' ? <Delete size={24} /> : item.n}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#8696a0', marginTop: 2 }}>{item.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderArchivedChatsDrawer = () => {
        const archivedUsers = users.filter(u => archivedChatIds.includes(u._id));
        const archivedGroups = groups.filter(g => archivedChatIds.includes(g._id));
        const allArchived = [...archivedGroups, ...archivedUsers];

        return (
            <div className={`wa-profile-drawer wa-new-chat-drawer ${isArchivedChatsOpen ? 'active' : ''}`}>
                <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'white', borderBottom: '1px solid #e9edef', boxSizing: 'border-box', width: '100%' }}>
                    <button
                        onClick={() => { setIsArchivedChatsOpen(false); }}
                        style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', marginRight: 15, display: 'flex', alignItems: 'center', width: 32, padding: 0, flexShrink: 0 }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('chat_list.archived')}</span>
                </div>

                <div className="wa-drawer-content wa-user-list" style={{ background: 'white', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                    {allArchived.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8696a0', padding: 40, textAlign: 'center' }}>
                            <Archive size={48} style={{ marginBottom: 20, opacity: 0.5 }} />
                            <div style={{ fontSize: 14 }}>{t('chat_list.no_archived_chats')}</div>
                        </div>
                    ) : (
                        allArchived.map(item => {
                            const isGroup = !!item.members;
                            const displayName = item.name || (isGroup ? 'Unnamed Group' : 'User');
                            return (
                                <div
                                    key={item._id}
                                    className="wa-user-item"
                                    onClick={() => {
                                        if (isGroup) {
                                            setSelectedGroup(item);
                                            setSelectedUser(null);
                                            fetchGroupMessages(item._id);
                                        } else {
                                            handleUserSelect(item);
                                            setSelectedGroup(null);
                                        }
                                    }}
                                    onContextMenu={(e) => { e.preventDefault(); setOpenDropdown({ type: 'contact', id: item._id }); }}
                                    onTouchStart={(e) => { e.persist(); longPressTimer.current = setTimeout(() => { setOpenDropdown({ type: 'contact', id: item._id }); }, 600); }}
                                    onTouchEnd={() => clearTimeout(longPressTimer.current)}
                                    onTouchMove={() => clearTimeout(longPressTimer.current)}
                                >
                                    <div className="wa-avatar">
                                        {isGroup ? (
                                            item.icon ? (
                                                <img src={item.icon} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <Camera size={22} color="#8696a0" />
                                            )
                                        ) : (
                                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#54656f' }}>
                                                {displayName.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="wa-chat-info">
                                        <div className="wa-chat-row-top">
                                            <span className="wa-chat-name">{displayName}</span>
                                            <span className="wa-chat-time">{formatTime(item.lastMessage?.created_at)}</span>
                                        </div>
                                        <div className="wa-chat-row-bottom">
                                            <span className="wa-chat-last-msg">
                                                {item.lastMessage?.type === 'image' ? '📷 Photo' :
                                                    item.lastMessage?.type === 'file' ? '📄 File' :
                                                        item.lastMessage?.content || 'No messages'}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {item.isMuted && <BellOff size={14} color="#8696a0" />}
                                                {item.isPinned && <Pin size={14} color="#8696a0" style={{ transform: 'rotate(45deg)' }} />}
                                                {item.unreadCount > 0 && <div className="wa-unread-badge">{item.unreadCount}</div>}
                                                <ChevronDown
                                                    size={18}
                                                    color="#8696a0"
                                                    style={{ marginLeft: 4, opacity: 0.6, cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdown({ type: 'contact', id: item._id });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {renderDropdownMenu('contact', item._id, item)}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const navigateToMessage = async (msg) => {
        // Starred panel stays open as per user request
        if (msg.isGroup) {
            const group = groups.find(g => g._id === msg.group_id?._id) || msg.group_id;
            setSelectedGroup(group);
            setSelectedUser(null);
            await fetchGroupMessages(group._id);
        } else {
            const myId = userData._id || userData.id;
            const otherId = String(msg.user_id?._id) === String(myId) ? msg.receiver_id?._id : msg.user_id?._id;
            const otherUser = users.find(u => String(u._id) === String(otherId));
            if (otherUser) {
                handleUserSelect(otherUser);
                setSelectedGroup(null);
            }
        }
        setTimeout(() => {
            handleSearchClick(msg._id);
        }, 500);
    };

    const renderGlobalStarredDrawer = () => {
        return (
            <div className={`wa-profile-drawer wa-new-chat-drawer ${isGlobalStarredOpen ? 'active' : ''}`}>
                <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'white', borderBottom: '1px solid #e9edef', boxSizing: 'border-box', width: '100%' }}>
                    <button
                        onClick={() => { setIsGlobalStarredOpen(false); }}
                        style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', marginRight: 15, display: 'flex', alignItems: 'center', width: 32, padding: 0, flexShrink: 0 }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('contact_info.starred_messages')}</span>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ position: 'relative' }}>
                        <button
                            className="wa-nav-icon-btn"
                            onClick={(e) => { e.stopPropagation(); setIsGlobalStarredMenuOpen(prev => !prev); }}
                            style={{ background: 'none', border: 'none', padding: 0 }}
                        >
                            <MoreVertical size={20} color="#54656f" />
                        </button>
                        {isGlobalStarredMenuOpen && (
                            <div className="wa-menu-dropdown wa-starred-menu-dropdown" ref={globalStarredMenuRef} style={{ top: '100%', right: 0, left: 'auto', marginTop: 8 }}>
                                <div className="wa-menu-item wa-starred-menu-item" onClick={handleGlobalUnstarAllRequest} style={{ display: 'flex', alignItems: 'center', padding: '10px 15px', gap: 12 }}>
                                    <StarOff size={18} color="#3b4a54" />
                                    <span>{t('chat_list.unstar_all')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="wa-drawer-content wa-user-list" style={{ background: '#f0f2f5', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 0 }}>
                    {isGlobalStarredLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#8696a0' }}>
                            <CircleDashed size={24} className="wa-spinner" style={{ animation: 'waSpinner 1s linear infinite' }} />
                        </div>
                    ) : globalStarredMessages.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8696a0', padding: 40, textAlign: 'center' }}>
                            <Star size={48} style={{ marginBottom: 20, opacity: 0.5 }} />
                            <div style={{ fontSize: 14 }}>{t('chat_list.no_starred_messages')}</div>
                        </div>
                    ) : (
                        globalStarredMessages.map((msg, idx) => {
                            const myId = userData._id || userData.id;
                            const senderObj = msg.isGroup ? msg.sender_id : msg.user_id;
                            const isMe = String(senderObj?._id || senderObj) === String(myId);
                            const senderName = isMe ? t('chat_window.you') : (senderObj?.name || 'Someone');

                            let recipientName = '';
                            if (msg.isGroup) {
                                recipientName = msg.group_id?.name || 'Group';
                            } else {
                                if (isMe) {
                                    const recId = msg.receiver_id?._id || msg.receiver_id;
                                    const isSentToSelf = String(recId) === String(myId);
                                    recipientName = isSentToSelf ? t('chat_window.you') : (msg.receiver_id?.name || 'User');
                                } else {
                                    recipientName = t('chat_window.you');
                                }
                            }

                            return (
                                <div key={idx} className="wa-starred-item" onClick={() => navigateToMessage(msg)} style={{ margin: '8px 12px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 1px 0 rgba(11,20,26,.06)', cursor: 'pointer' }}>
                                    <div className="wa-starred-item-header" style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="wa-starred-names" style={{ fontSize: '13px', color: '#54656f', display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                            <span style={{ fontWeight: '500' }}>{senderName}</span>
                                            <ChevronRight size={14} />
                                            <span style={{ fontWeight: '500' }}>{recipientName}</span>
                                        </div>
                                        <div className="wa-starred-date" style={{ fontSize: '11px', color: '#8696a0' }}>
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </div>
                                        <ChevronRight size={14} color="#8696a0" />
                                    </div>
                                    <div style={{ padding: '0 12px 12px' }}>
                                        <div className={`wa-starred-bubble ${isMe ? 'sent' : 'received'}`} style={{ maxWidth: '100%', margin: 0, padding: '6px 7px 8px' }}>
                                            <div className="wa-starred-content">
                                                {msg.type === 'image' && msg.file_path && (
                                                    <img src={msg.file_path} alt="" style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '4px', display: 'block' }} />
                                                )}
                                                {msg.content && <div className="wa-msg-text" style={{ fontSize: '14.2px', lineHeight: '19px', color: '#111b21', wordBreak: 'break-word' }}>{msg.content}</div>}
                                            </div>
                                            <div className="wa-starred-meta" style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                                                <Star size={10} fill="#8696a0" color="#8696a0" />
                                                <span style={{ fontSize: '10px', color: '#8696a0' }}>{formatTime(msg.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {isUnstarConfirmOpen && unstarTarget === 'global' && (
                    <div className="wa-unstar-confirm-bar">
                        <div className="wa-unstar-confirm-content">
                            <span>{t('chat_list.unstar_all_confirm')}</span>
                            <div className="wa-unstar-confirm-actions">
                                <button className="wa-unstar-btn cancel" onClick={() => setIsUnstarConfirmOpen(false)}>{t('lang_confirm.cancel')}</button>
                                <button className="wa-unstar-btn confirm" onClick={confirmUnstarAll}>{t('chat_list.ok')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderNewGroupDrawer = () => {
        if (newGroupStep === 2) {
            return (
                <div className={`wa-profile-drawer wa-new-group-drawer ${isNewGroupOpen ? 'active' : ''}`}>
                    <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 16px', background: 'white', borderBottom: 'none' }}>
                        <button onClick={() => { setNewGroupStep(1); setGroupIcon(null); }} style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, width: 40 }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginRight: 40 }}>
                            <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap' }}>{t('new_chat.new_group')}</span>
                        </div>
                        <div style={{ width: 40 }}></div>
                    </div>

                    <div className="wa-drawer-content" style={{ background: 'white', overflowY: 'auto', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div className="wa-group-details-body" style={{ padding: '20px 0' }}>
                            <div className="wa-group-icon-picker-container" style={{ position: 'relative', marginBottom: 25 }}>
                                <div className={`wa-group-icon-picker ${groupIcon ? 'has-icon' : ''}`} onClick={(e) => { e.stopPropagation(); setIsGroupIconMenuOpen(!isGroupIconMenuOpen); }}>
                                    {groupIcon ? (
                                        <>
                                            <img src={groupIcon} alt="Group Icon" className="wa-group-actual-icon" />
                                            <div className="wa-group-icon-hover">
                                                <Camera size={24} color="white" />
                                                <span>{t('new_chat.change_group_icon')}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera size={48} />
                                            <span>{t('new_chat.add_group_icon')}</span>
                                        </>
                                    )}
                                </div>
                                {isGroupIconMenuOpen && (
                                    <div className="wa-group-icon-menu" ref={groupIconMenuRef} style={{ top: '60%', left: '50%', transform: 'translate(-50%, 0)', marginLeft: 0 }}>
                                        <div className="wa-group-icon-menu-item" onClick={handleCameraAction}>
                                            <Camera size={20} color="#54656f" />
                                            <span>{t('new_chat.take_photo')}</span>
                                        </div>
                                        <div className="wa-group-icon-menu-item">
                                            <Image size={20} color="#54656f" />
                                            <span>{t('new_chat.upload_photo')}</span>
                                        </div>
                                        <div className="wa-group-icon-menu-item">
                                            <Smile size={20} color="#54656f" />
                                            <span>{t('new_chat.emoji_sticker')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="wa-group-subject-container">
                                <div className="wa-group-subject-wrapper">
                                    <input
                                        type="text"
                                        className="wa-group-subject-input"
                                        placeholder={t('new_chat.group_subject_placeholder')}
                                        value={groupSubject}
                                        onChange={(e) => setGroupSubject(e.target.value)}
                                        autoFocus
                                    />
                                    <Smile size={24} color="#54656f" style={{ cursor: 'pointer' }} />
                                </div>
                            </div>

                            <div className="wa-group-settings-container">
                                <div className="wa-group-setting-item" onClick={() => setNewGroupStep(3)}>
                                    <div className="wa-group-setting-info">
                                        <span className="wa-group-setting-title">{t('new_chat.group_permissions')}</span>
                                    </div>
                                    <ChevronRight size={20} color="#667781" />
                                </div>
                            </div>
                        </div>

                        <button className="wa-group-checkmark-fab" onClick={createGroup}>
                            <Check size={28} />
                        </button>
                    </div>
                </div>
            );
        }

        if (newGroupStep === 3) {
            const togglePerm = (key) => {
                const newValue = !groupPerms[key];
                setGroupPerms(prev => ({ ...prev, [key]: newValue }));

                let message = "";
                switch (key) {
                    case "editSettings":
                        message = newValue ? "You allowed members to edit group settings" : "You allowed only admins to edit group settings";
                        break;
                    case "sendMessages":
                        message = newValue ? "You allowed members to send new messages" : "You allowed only admins to send new messages";
                        break;
                    case "addMembers":
                        message = newValue ? "You allowed members to add others to this group" : "You allowed only admins to add others to this group";
                        break;
                    case "inviteLink":
                        message = newValue ? "You allowed members to share invite links to this group" : "You allowed only admins to share invite links to this group";
                        break;
                    case "approveMembers":
                        message = newValue ? "You turned on membership approval mode in this chat" : "You turned off membership approval mode in this chat";
                        break;
                    default: break;
                }
                if (message) showPermissionToast(message);
            };

            const PermissionItem = ({ icon: Icon, title, description, permKey, showLearnMore }) => (
                <div className="wa-perm-item">
                    <div className="wa-perm-icon">
                        <Icon size={20} color="#54656f" />
                    </div>
                    <div className="wa-perm-content">
                        <div className="wa-perm-header">
                            <span className="wa-perm-title">{title}</span>
                            <div className={`wa-switch ${groupPerms[permKey] ? 'active' : ''}`} onClick={() => togglePerm(permKey)}>
                                <div className="wa-switch-knob"></div>
                            </div>
                        </div>
                        {description && (
                            <div className="wa-perm-description">
                                {description} {showLearnMore && <span className="wa-learn-more" onClick={(e) => { e.stopPropagation(); }}>Learn more</span>}
                            </div>
                        )}
                    </div>
                </div>
            );

            return (
                <div className={`wa-profile-drawer wa-new-group-drawer ${isNewGroupOpen ? 'active' : ''}`}>
                    <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 16px', background: 'white', borderBottom: 'none' }}>
                        <button onClick={() => setNewGroupStep(2)} style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, width: 40 }}>
                            <ArrowLeft size={24} />
                        </button>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginRight: 40 }}>
                            <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap' }}>{t('new_chat.group_permissions')}</span>
                        </div>
                        <div style={{ width: 40 }}></div>
                    </div>

                    <div className="wa-drawer-content" style={{ background: 'white', overflowY: 'auto', flex: 1, position: 'relative' }}>
                        <div className="wa-perms-container">
                            <div className="wa-perms-section-label">{t('new_chat.members_can')}</div>
                            <PermissionItem
                                icon={Pencil}
                                title="Edit group settings"
                                description="This includes the name, icon, description, disappearing message timer, and the ability to pin, keep or unkeep messages."
                                permKey="editSettings"
                            />
                            <PermissionItem
                                icon={MessageSquare}
                                title="Send new messages"
                                permKey="sendMessages"
                            />
                            <PermissionItem
                                icon={UserPlus}
                                title="Add other members"
                                permKey="addMembers"
                            />
                            <PermissionItem
                                icon={LinkIcon}
                                title="Invite via link"
                                permKey="inviteLink"
                            />

                            <div className="wa-perms-section-label" style={{ marginTop: 20 }}>Admins can:</div>
                            <PermissionItem
                                icon={Users}
                                title="Approve new members"
                                description="When turned on, admins must approve anyone who wants to join this group."
                                permKey="approveMembers"
                                showLearnMore
                            />
                        </div>
                    </div>

                    {/* Permission Toasts Container */}
                    {permissionToasts.length > 0 && (
                        <div className="wa-perm-toasts-container">
                            {permissionToasts.map(toast => (
                                <div key={toast.id} className="wa-perm-toast-item">
                                    {toast.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        const sortedUsers = [...users].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const grouped = sortedUsers.reduce((acc, u) => {
            const letter = (u.name?.[0] || "#").toUpperCase();
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(u);
            return acc;
        }, {});
        const letters = Object.keys(grouped).sort();

        const toggleMember = (u) => {
            if (selectedGroupMembers.find(m => m._id === u._id)) {
                setSelectedGroupMembers(selectedGroupMembers.filter(m => m._id !== u._id));
            } else {
                setSelectedGroupMembers([...selectedGroupMembers, u]);
                setGroupSearchQuery(''); // Clear search after adding
            }
        };

        return (
            <div className={`wa-profile-drawer wa-new-group-drawer ${isNewGroupOpen ? 'active' : ''}`}>
                <div className="wa-drawer-header" style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 16px', background: 'white', borderBottom: 'none', gap: 0 }}>
                    <button onClick={() => { setIsNewGroupOpen(false); setSelectedGroupMembers([]); setNewGroupStep(1); setGroupSubject(''); }} style={{ background: 'none', border: 'none', color: '#027EB5', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 500, padding: 0 }}>
                        Close
                    </button>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginRight: 40 }}>
                        <span style={{ fontSize: 19, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap' }}>Add group members</span>
                    </div>
                    <div style={{ width: 45 }}></div>
                </div>

                <div className="wa-drawer-content" style={{ background: 'white', overflowY: 'auto', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {/* Selected Members PILE */}
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #e9edef', minHeight: 60 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                            {selectedGroupMembers.map(m => (
                                <div key={m._id} className="wa-group-member-chip" style={{ display: 'flex', alignItems: 'center', background: '#f0f2f5', borderRadius: 20, padding: '4px 4px 4px 4px', gap: 8 }}>
                                    <div className="wa-chip-avatar" style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: '#dfe1e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {m.image ? <img src={m.image} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12 }}>{m.name?.[0]}</span>}
                                    </div>
                                    <span style={{ fontSize: 14, color: '#111b21' }}>{m.name}</span>
                                    <X size={16} color="#667781" style={{ cursor: 'pointer', marginRight: 8 }} onClick={() => toggleMember(m)} />
                                </div>
                            ))}
                            <input
                                type="text"
                                placeholder={selectedGroupMembers.length === 0 ? "Search name or number" : ""}
                                style={{ border: 'none', outline: 'none', padding: '8px 0', fontSize: 15, flex: 1, minWidth: 120, background: 'transparent' }}
                                value={groupSearchQuery}
                                onChange={(e) => setGroupSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && groupSearchQuery === '' && selectedGroupMembers.length > 0) {
                                        const lastMember = selectedGroupMembers[selectedGroupMembers.length - 1];
                                        toggleMember(lastMember);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {/* Grouped Contacts */}
                        {letters.map(letter => {
                            const filtered = grouped[letter].filter(u =>
                                u.name?.toLowerCase().includes(groupSearchQuery.toLowerCase()) &&
                                !selectedGroupMembers.some(m => m._id === u._id)
                            );
                            if (filtered.length === 0) return null;

                            return (
                                <div key={letter} className="wa-contact-group">
                                    <div style={{ padding: '15px 16px 5px', color: '#667781', fontSize: 14, fontWeight: 500 }}>{letter}</div>
                                    {filtered.map(u => (
                                        <div key={u._id} className="wa-user-item" onClick={() => toggleMember(u)}>
                                            <div className="wa-avatar">
                                                {u.image ? <img src={u.image} alt={u.name} /> : <span>{u.name?.charAt(0).toUpperCase()}</span>}
                                            </div>
                                            <div className="wa-user-info">
                                                <div className="wa-user-name" style={{ fontWeight: 500 }}>{u.name}</div>
                                                <div className="wa-user-last-msg" style={{ fontSize: 13, color: '#667781' }}>{u.about || 'Available'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* FAB */}
                    {selectedGroupMembers.length > 0 && (
                        <button className="wa-group-next-fab" onClick={() => { setNewGroupStep(2); setGroupIcon(null); }} style={{
                            position: 'absolute',
                            bottom: 25,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 55,
                            height: 55,
                            borderRadius: '50%',
                            background: '#027EB5',
                            color: 'white',
                            border: 'none',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10
                        }}>
                            <ArrowRight size={28} />
                        </button>
                    )}
                </div>
            </div>
        );
    }; const renderFilePreview = () => (
        <div className="wa-file-preview-overlay" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e9edef', position: 'relative' }}>
            {/* Header */}
            <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#3b6e9e', color: 'white' }}>
                <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
                    <ArrowLeft size={24} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', padding: 20 }}>
                {file && file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
                ) : (
                    <div style={{ textAlign: 'center', padding: 40, background: 'white', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>{file?.name}</div>
                        <div style={{ fontSize: 14, color: '#667781', marginTop: 5 }}>
                            {file?.size ? Math.ceil(file.size / 1024) + ' kB' : ''} • {file?.type?.split('/').pop().toUpperCase()}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Caption Input */}
            <div style={{ padding: '10px 15px', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="wa-input-pill" style={{ flex: 1, background: 'white' }}>
                    <input
                        type="text"
                        className="wa-input-box"
                        placeholder="Add a caption..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSend(e);
                        }}
                        autoFocus
                    />
                </div>
                <button onClick={handleSend} className="wa-nav-icon-btn wa-send-btn">
                    <Send size={20} color="white" />
                </button>
            </div>
        </div>
    );

    const renderSearchSidebar = () => (
        <div className={`wa-search-sidebar ${isMessageSearchOpen ? 'active' : ''}`}>
            <div className="wa-header" style={{ height: 60, padding: '5px 10px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', background: '#f0f2f5', borderBottom: '1px solid #d1d7db' }}>
                <button
                    onClick={() => {
                        setIsMessageSearchOpen(false);
                        setMessageSearchQuery('');
                        if (searchSource.current === 'contact_info') {
                            setIsContactInfoOpen(true);
                        }
                    }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#027EB5', justifySelf: 'start' }}
                >
                    <span style={{ fontSize: 16, fontWeight: 500 }}>{t('lang_confirm.cancel')}</span>
                </button>
                <span style={{ fontSize: 16, fontWeight: 500, color: '#111b21', whiteSpace: 'nowrap', justifySelf: 'center' }}>{t('chat_list.search_messages')}</span>
                <div style={{ justifySelf: 'end' }} />
            </div>

            <div style={{ padding: '20px 15px', background: 'white', flex: 1, overflowY: 'auto' }}>

                <div style={{ background: '#f0f2f5', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                    <Search size={20} color="#54656f" style={{ marginRight: 12 }} />
                    <input
                        type="text"
                        placeholder={t('settings.search_placeholder')}
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', color: 'black', fontSize: 14, outline: 'none', width: '100%' }}
                        autoFocus
                    />
                </div>

                <div style={{ marginTop: 20 }}>
                    {isSearching ? (
                        <div style={{ textAlign: 'center', color: '#8696a0', fontSize: 14, marginTop: 40 }}>
                            {t('chat_list.looking_for_messages')}
                        </div>
                    ) : (
                        searchResults.length > 0 ? (
                            <div className="wa-search-results-list">
                                {searchResults.map((res, idx) => (
                                    <div key={idx} className="wa-search-result-item" onClick={() => handleSearchClick(res._id)}>
                                        <div className="wa-search-result-date">{res.time}</div>
                                        <div className="wa-search-result-content">
                                            <div style={{ marginRight: 8, display: 'flex', alignItems: 'center' }}>
                                                <CheckCheck size={16} color="#53bdeb" />
                                            </div>
                                            <div className="wa-search-result-text">
                                                {/* Highlight Logic */}
                                                {res.content.split(new RegExp(`(${messageSearchQuery})`, 'gi')).map((part, i) => (
                                                    part.toLowerCase() === messageSearchQuery.toLowerCase() ?
                                                        <span key={i} className="wa-search-highlight">{part}</span> : part
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            messageSearchQuery ? (
                                <div style={{ textAlign: 'center', color: '#8696a0', fontSize: 14, marginTop: 40 }}>
                                    No messages found.
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#8696a0', fontSize: 14, marginTop: 40 }}>
                                    Search for messages with {selectedUser ? selectedUser.name : 'yourself'}.
                                </div>
                            )
                        )
                    )}
                </div>
            </div>
        </div>
    );

    const renderContactInfoPanel = () => {
        const activeTarget = selectedUser || selectedGroup;
        if (!activeTarget) return null;

        const isGroup = !!selectedGroup;
        const displayName = activeTarget.name || (isGroup ? 'Group' : 'User');
        const displayPhoto = isGroup ? activeTarget.icon : (activeTarget.image || null);
        const displaySubtext = isGroup ? `${activeTarget.members?.length || 0} members` : (activeTarget.mobile || 'Available');

        return (
            <div className={`wa-contact-info-panel ${isContactInfoOpen ? 'active' : ''}`}>
                <div className="wa-contact-info-header" style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', borderBottom: '1px solid #e9edef', background: 'white' }}>

                    <button className="wa-contact-info-close-btn" onClick={() => setIsContactInfoOpen(false)} style={{ position: 'absolute', left: 16, zIndex: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: 16, color: '#027EB5', fontWeight: 500 }}>{t('lang_confirm.cancel')}</span>
                    </button>

                    <span className="wa-contact-info-title" style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 22, fontWeight: 500, color: '#3b4a54', pointerEvents: 'none' }}>
                        {isGroup ? t('contact_info.group_title') : t('contact_info.title')}
                    </span>

                    <button
                        className="wa-contact-info-edit-btn"
                        style={{ position: 'absolute', right: 16, zIndex: 10, background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                            const names = (selectedUser.name || '').split(' ');
                            setEditFirstName(names[0] || '');
                            setEditLastName(names.slice(1).join(' ') || '');
                            setEditPhone(selectedUser.mobile || '');
                            setIsEditContactOpen(true);
                        }}
                    >
                        <span style={{ fontSize: 16, color: '#027EB5', fontWeight: 500 }}>Edit</span>
                    </button>
                </div>

                <div className="wa-contact-info-content">
                    {/* Pattern Background */}
                    <div className="wa-contact-info-bg"></div>

                    <div className="wa-contact-profile-section">
                        <div className="wa-contact-avatar-large" style={{ background: '#dfe5e7' }}>
                            {displayPhoto ? (
                                <img src={displayPhoto} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: 40, color: '#54656f' }}>
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="wa-contact-name-large">{displayName}</div>
                        <div className="wa-contact-phone-large">{displaySubtext}</div>

                        {/* Action Buttons */}
                        <div className="wa-contact-actions-row">
                            <div className="wa-contact-action-btn" onClick={() => {
                                setIsContactInfoOpen(false); // Close contact info
                                setIsMessageSearchOpen(true); // Open search sidebar
                                searchSource.current = 'contact_info'; // Set source
                                // Search query for selectedUser is already handled by renderSearchSidebar logic using selectedUser
                            }}>
                                <div className="wa-action-icon-box"><Search size={20} color="#027EB5" /></div>
                                <span>Search</span>
                            </div>
                            <div className="wa-contact-action-btn">
                                <div className="wa-action-icon-box"><Video size={20} color="#027EB5" /></div>
                                <span>Video</span>
                            </div>
                            <div className="wa-contact-action-btn">
                                <div className="wa-action-icon-box"><Phone size={20} color="#027EB5" /></div>
                                <span>Voice</span>
                            </div>
                        </div>
                    </div>

                    <div className="wa-contact-section-divider"></div>

                    {/* About Section */}
                    <div className="wa-contact-info-item">
                        <div className="wa-info-item-label">{t('profile_drawer.about_label')}</div>
                        <div className="wa-info-item-value">{activeTarget.about || 'Available'}</div>
                    </div>

                    <div className="wa-contact-section-divider"></div>

                    {/* Media, Links, Docs */}
                    <div className="wa-contact-info-item clickable" onClick={() => setIsSharedMediaOpen(true)}>
                        <div className="wa-info-item-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span className="wa-info-item-text">{t('contact_info.media_links_docs')}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="wa-info-item-count">
                                        {(activeTarget.mediaCount || 0) + (activeTarget.linkCount || 0) + (activeTarget.docCount || 0)}
                                    </span>
                                    <ChevronDown size={20} color="#8696a0" style={{ transform: 'rotate(-90deg)' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#667781' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Image size={14} /> <span>{activeTarget.mediaCount || 0} Media</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <LinkIcon size={14} /> <span>{activeTarget.linkCount || 0} Links</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <FileText size={14} /> <span>{activeTarget.docCount || 0} Docs</span>
                                </div>
                            </div>
                        </div>
                        <div className="wa-media-preview-row">
                            {(() => {
                                const chatMsgs = isGroup ? groupMessages : messages;
                                const activeMsgs = chatMsgs.filter(m => !m.is_deleted_by_user && !m.is_deleted_by_admin);

                                // Prioritize: Images > Links > Docs
                                const images = chatMsgs.filter(m => m.type === 'image' || m.type === 'video').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                const links = chatMsgs.filter(m => (m.link_preview && m.link_preview.url) && m.type !== 'image' && m.type !== 'video').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                const docs = chatMsgs.filter(m => m.type === 'file').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                                const previewItems = [...images, ...links, ...docs].slice(0, 4);

                                return (
                                    <>
                                        {previewItems.map((m, i) => {
                                            if (m.type === 'image' || m.type === 'video') {
                                                return (
                                                    <div key={i} className="wa-media-thumb" onClick={(e) => { e.stopPropagation(); setViewingImage(m); }} style={{ cursor: 'pointer', flexShrink: 0 }}>
                                                        <img src={m.file_path} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                                                    </div>
                                                );
                                            }
                                            if (m.type === 'file') {
                                                return (
                                                    <div key={i} className="wa-media-thumb" style={{ background: '#f0f2f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleDownload(m.file_path, m.fileName); }}>
                                                        <FileText size={24} color="#8696a0" />
                                                        <div style={{ fontSize: 10, color: '#667781', textAlign: 'center', marginTop: 4, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {m.fileName || 'Doc'}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            // Link
                                            if (m.link_preview && m.link_preview.image) {
                                                return (
                                                    <div key={i} className="wa-media-thumb" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); window.open(m.link_preview.url, '_blank'); }}>
                                                        <img src={m.link_preview.image} alt="link" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={i} className="wa-media-thumb" style={{ background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); window.open(m.link_preview?.url, '_blank'); }}>
                                                    <LinkIcon size={24} color="#8696a0" />
                                                </div>
                                            );
                                        })}
                                        {[...Array(Math.max(0, 4 - previewItems.length))].map((_, i) => (
                                            <div key={`empty-${i}`} className="wa-media-thumb" style={{ background: '#f0f2f5', flexShrink: 0 }}></div>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="wa-contact-section-divider"></div>

                    {/* Settings List */}
                    <div className="wa-contact-settings-list">
                        <div className="wa-setting-item clickable" onClick={() => {
                            setIsContactInfoOpen(false);
                            setIsStarredMessagesOpen(true);
                        }}>
                            <div className="wa-setting-icon"><Star size={20} color="#54656f" /></div>
                            <div className="wa-setting-text">{t('contact_info.starred_messages')}</div>
                            <ChevronDown size={20} color="#8696a0" style={{ transform: 'rotate(-90deg)' }} />
                        </div>
                        <div className="wa-setting-item clickable" onClick={() => {
                            setIsContactInfoOpen(false);
                            setIsNotificationSettingsOpen(true);
                        }}>
                            <div className="wa-setting-icon"><BellOff size={20} color="#54656f" /></div>
                            <div className="wa-setting-text">{t('contact_info.mute_notifications')}</div>
                            <ChevronDown size={20} color="#8696a0" style={{ transform: 'rotate(-90deg)' }} />
                        </div>
                        <div className="wa-setting-item">
                            <div className="wa-setting-icon"><CircleDashed size={20} color="#54656f" /></div>
                            <div className="wa-setting-text">
                                <div>{t('contact_info.disappearing_messages')}</div>
                                <div className="wa-setting-subtext">Off</div>
                            </div>
                            <ChevronDown size={20} color="#8696a0" style={{ transform: 'rotate(-90deg)' }} />
                        </div>
                        <div className="wa-setting-item">
                            <div className="wa-setting-icon"><Lock size={20} color="#54656f" /></div>
                            <div className="wa-setting-text">
                                <div>{t('contact_info.encryption')}</div>
                                <div className="wa-setting-subtext">Messages are end-to-end encrypted. Click to verify.</div>
                            </div>
                        </div>
                    </div>

                    <div className="wa-contact-section-divider"></div>

                    {/* Group specific: Members or common groups */}
                    {isGroup ? (
                        <div className="wa-contact-info-item">
                            <div className="wa-info-item-label" style={{ marginBottom: 15 }}>{activeTarget.members?.length || 0} members</div>
                            <div className="wa-member-list">
                                {activeTarget.members?.map(m => (
                                    <div key={m._id} className="wa-common-group-item">
                                        <div className="wa-group-avatar" style={{ background: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {m.image ? <img src={m.image} alt="mem" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <span>{m.name?.charAt(0)}</span>}
                                        </div>
                                        <div className="wa-group-info">
                                            <div className="wa-group-name">{m.name} {m._id === user.id ? '(You)' : ''}</div>
                                            <div className="wa-group-members">{m.about || 'Available'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="wa-contact-info-item">
                            <div className="wa-info-item-label" style={{ marginBottom: 15 }}>Groups in common</div>
                            <div style={{ color: '#8696a0', fontSize: 13, padding: '10px 0' }}>No groups in common</div>
                        </div>
                    )}

                    <div className="wa-contact-section-divider"></div>

                    {/* Block / Report / Exit */}
                    <div className="wa-contact-danger-zone">
                        {isGroup ? (
                            <div className="wa-setting-item danger" onClick={() => { /* Exit Logic */ }}>
                                <div className="wa-setting-icon"><XCircle size={20} color="#e53935" /></div>
                                <div className="wa-setting-text">{t('contact_info.exit_group')}</div>
                            </div>
                        ) : (
                            <div className="wa-setting-item danger">
                                <div className="wa-setting-icon"><HeartOff size={20} color="#e53935" /></div>
                                <div className="wa-setting-text">{t('contact_info.block', { name: displayName })}</div>
                            </div>
                        )}
                        <div className="wa-setting-item danger">
                            <div className="wa-setting-icon"><ThumbsDown size={20} color="#e53935" /></div>
                            <div className="wa-setting-text">{isGroup ? t('contact_info.report_group') : t('contact_info.report', { name: displayName })}</div>
                        </div>
                    </div>

                    <div style={{ height: 40 }}></div>
                </div>
            </div>
        );
    };

    const formatDateForInfo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'today';
        if (date.toDateString() === yesterday.toDateString()) return 'yesterday';
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase();
    };

    const renderStarredMessagesPanel = () => {
        const activeTarget = selectedUser || selectedGroup;
        if (!activeTarget) return null;

        const isGroup = !!selectedGroup;
        const starredMsgs = (isGroup ? groupMessages : messages).filter(m => m.is_starred);

        return (
            <div className={`wa-starred-messages-panel ${isStarredMessagesOpen ? 'active' : ''}`}>
                <div className="wa-panel-header starred" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'space-between' }}>
                        <button className="wa-panel-back-btn" onClick={() => {
                            setIsStarredMessagesOpen(false);
                            setIsContactInfoOpen(true);
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#027EB5', fontSize: '16px', fontWeight: 500, padding: 0, paddingLeft: '12px', zIndex: 10 }}>
                            Back
                        </button>
                        <span className="wa-panel-title" style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 17, fontWeight: 500, color: '#3b4a54', pointerEvents: 'none' }}>Starred messages</span>
                        <div className="wa-panel-actions" style={{ position: 'relative', zIndex: 10 }}>
                            <button
                                className="wa-nav-icon-btn"
                                onClick={(e) => { e.stopPropagation(); setIsStarredMenuOpen(prev => !prev); }}
                                style={{ background: 'none', border: 'none', padding: 0 }}
                            >
                                <MoreVertical size={20} color="#54656f" />
                            </button>
                            {isStarredMenuOpen && (
                                <div className="wa-starred-menu-dropdown" ref={starredMenuRef}>
                                    <div className="wa-starred-menu-item" onClick={handleUnstarAllRequest}>
                                        <StarOff size={18} color="#3b4a54" />
                                        <span>Unstar all</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="wa-starred-list">
                    {starredMsgs.length > 0 ? (
                        starredMsgs.map((msg, idx) => {
                            const myId = user.id || user._id;
                            const isMe = String(msg.sender_id?._id || msg.sender_id || msg.user_id) === String(myId);
                            const senderName = isMe ? 'You' : (msg.sender_id?.name || msg.user_id?.name || activeTarget.name || 'Someone');

                            let recipientName = '';
                            if (isGroup) {
                                recipientName = activeTarget.name || 'Group';
                            } else {
                                if (isMe) {
                                    const recId = msg.receiver_id?._id || msg.receiver_id;
                                    const isSentToSelf = String(recId) === String(myId);
                                    recipientName = isSentToSelf ? 'You' : (msg.receiver_id?.name || activeTarget.name || 'User');
                                } else {
                                    recipientName = 'You';
                                }
                            }
                            const dateStr = new Date(msg.created_at).toLocaleDateString('en-US');

                            return (
                                <div key={idx} className="wa-starred-item" onClick={() => {
                                    handleSearchClick(msg._id);
                                }}>
                                    <div className="wa-starred-item-header">
                                        <div className="wa-starred-avatar">
                                            {isMe ? (
                                                userData.image ? <img src={userData.image} alt="Me" /> : <div className="wa-avatar-placeholder">{userData.name?.charAt(0)}</div>
                                            ) : (
                                                activeTarget.image ? <img src={activeTarget.image} alt="Target" /> : <div className="wa-avatar-placeholder">{activeTarget.name?.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div className="wa-starred-names">
                                            <span className="wa-starred-sender">{senderName}</span>
                                            <ChevronRight size={14} className="wa-starred-arrow" />
                                            <span className="wa-starred-recipient">{recipientName}</span>
                                        </div>
                                        <div className="wa-starred-date">{dateStr}</div>
                                    </div>
                                    <div className={`wa-starred-bubble-container ${isMe ? 'sent' : 'received'}`}>
                                        <div className={`wa-starred-bubble ${isMe ? 'sent' : 'received'}`}>
                                            <div className="wa-starred-content">
                                                {msg.type === 'image' && msg.file_path && (
                                                    <div className="wa-starred-image-container" onClick={(e) => { e.stopPropagation(); setViewingImage(msg); }} style={{ cursor: 'pointer' }}>
                                                        <img src={msg.file_path} alt="Starred" className="wa-starred-image" />
                                                    </div>
                                                )}
                                                {msg.type === 'file' && (
                                                    <div className="wa-starred-file-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                                        <FileText size={20} color="#e53935" />
                                                        <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.fileName || 'Document'}</span>
                                                    </div>
                                                )}
                                                {msg.content && <div className="wa-msg-text">{msg.content}</div>}
                                            </div>
                                            <div className="wa-starred-meta">
                                                <Star size={12} fill="#8696a0" color="#8696a0" />
                                                <span>{formatTime(msg.created_at)}</span>
                                                {isMe && (
                                                    <CheckCheck size={16} color={msg.is_read ? "#53bdeb" : "#8696a0"} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="wa-no-starred">
                            <Star size={48} color="#dfe1e5" />
                            <p>No starred messages</p>
                        </div>
                    )}
                </div>

                {isUnstarConfirmOpen && (
                    <div className="wa-unstar-confirm-bar">
                        <div className="wa-unstar-confirm-content">
                            <span>Unstar all messages?</span>
                            <div className="wa-unstar-confirm-actions">
                                <button className="wa-unstar-btn cancel" onClick={() => setIsUnstarConfirmOpen(false)}>Cancel</button>
                                <button className="wa-unstar-btn confirm" onClick={confirmUnstarAll}>OK</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMessageInfo = () => {
        if (!infoMessage) return null;

        return (
            <div className="wa-info-panel active" onClick={(e) => e.stopPropagation()}>
                <div className="wa-info-header" onClick={(e) => e.stopPropagation()}>
                    <button className="wa-info-close-btn" onClick={(e) => { e.stopPropagation(); setInfoMessage(null); }}>
                        <X size={24} color="#54656f" />
                    </button>
                    <span className="wa-info-title">Message info</span>
                </div>

                <div className="wa-info-content" onClick={(e) => e.stopPropagation()}>
                    {/* The message bubble preview section */}
                    <div className="wa-info-message-preview">
                        <div className="wa-chat-bg-overlay"></div>
                        <div className="wa-info-date-row">
                            <span className="wa-date-pill">{formatDateForInfo(infoMessage.created_at)}</span>
                        </div>
                        <div className={`wa-bubble sent`} style={{ whiteSpace: 'pre-wrap' }}>
                            {infoMessage.type === 'image' ? (
                                <div className="wa-msg-image">
                                    <img src={infoMessage.file_path} alt="sent" />
                                    {infoMessage.content && <p>{infoMessage.content}</p>}
                                </div>
                            ) : infoMessage.type === 'file' ? (
                                <div className="wa-msg-file">
                                    <FileText size={32} color="#8696a0" />
                                    <div className="wa-file-info">
                                        <p>{infoMessage.fileName}</p>
                                        <span>{infoMessage.fileSize} bytes • PDF</span>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{infoMessage.content}</p>
                            )}
                            <div className="wa-msg-meta">
                                {formatTime(infoMessage.created_at)}
                                <CheckCheck size={16} color={infoMessage.is_read ? "#53bdeb" : "#8696a0"} />
                            </div>
                        </div>
                    </div>

                    <div className="wa-info-stats">
                        <div className="wa-info-stat-card">
                            <div className="wa-info-stat-row">
                                <div className="wa-info-stat-icon">
                                    <CheckCheck size={20} color="#53bdeb" />
                                </div>
                                <div className="wa-info-stat-body">
                                    <div className="wa-info-stat-label">Read</div>
                                    <div className="wa-info-stat-time">
                                        {infoMessage.is_read ? (
                                            <>
                                                {formatDateForInfo(infoMessage.read_at)} {formatTime(infoMessage.read_at)}
                                            </>
                                        ) : '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="wa-dropdown-divider" style={{ margin: '0 0 0 52px' }}></div>
                            <div className="wa-info-stat-row">
                                <div className="wa-info-stat-icon">
                                    <CheckCheck size={20} color="#8696a0" />
                                </div>
                                <div className="wa-info-stat-body">
                                    <div className="wa-info-stat-label">Delivered</div>
                                    <div className="wa-info-stat-time">
                                        {formatDateForInfo(infoMessage.created_at)} {formatTime(infoMessage.created_at)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderImageViewer = () => {
        if (!viewingImage) return null;

        return <ImageViewer
            viewingImage={viewingImage}
            setViewingImage={setViewingImage}
            messages={messages}
            selectedUser={selectedUser}
            setMessages={setMessages}
            setForwardSelectedMsgs={setForwardSelectedMsgs}
            setIsForwardModalOpen={setIsForwardModalOpen}
            handleDownload={handleDownload}
            formatTime={formatTime}
            setSnackbar={setSnackbar}
        />;
    };

    // Refactored ImageViewer Component to handle complex state like cropping
    const ImageViewer = ({ viewingImage, setViewingImage, messages, selectedUser, setMessages, setForwardSelectedMsgs, setIsForwardModalOpen, handleDownload, formatTime, setSnackbar }) => {
        const [isCropping, setIsCropping] = useState(false);
        const [cropRect, setCropRect] = useState(null); // { x, y, width, height } (percentages)
        const [isDragging, setIsDragging] = useState(false);
        const [dragStart, setDragStart] = useState(null); // { x, y, initialRect }
        const imageRef = useRef(null);
        const containerRef = useRef(null);

        // Reset crop state when image changes
        useEffect(() => {
            setIsCropping(false);
            setCropRect(null);
        }, [viewingImage._id]);

        const viewableMsgs = messages.filter(m => m.type === 'image' || m.type === 'video'); // Removed 'file' to prevent navigation to docs
        const currentIndex = viewableMsgs.findIndex(m => m._id === viewingImage._id);

        const handleNext = (e) => {
            e.stopPropagation();
            if (currentIndex < viewableMsgs.length - 1) {
                setViewingImage(viewableMsgs[currentIndex + 1]);
            }
        };

        const handlePrev = (e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
                setViewingImage(viewableMsgs[currentIndex - 1]);
            }
        };

        const handleViewerStar = async (e) => {
            e.stopPropagation();
            try {
                const token = localStorage.getItem('token');
                const newStatus = !viewingImage.is_starred;

                await axios.post(`/api/chat/message/${viewingImage._id}/toggle`,
                    { action: 'star', value: newStatus },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                // Update local messages state
                setMessages(prev => prev.map(m =>
                    m._id === viewingImage._id ? { ...m, is_starred: newStatus } : m
                ));

                // Update viewingImage state
                setViewingImage(prev => ({ ...prev, is_starred: newStatus }));

            } catch (err) {
                console.error("Failed to star message", err);
                setSnackbar({ message: "Failed to update star", type: 'error' });
            }
        };

        const handleViewerForward = (e) => {
            e.stopPropagation();
            setForwardSelectedMsgs([viewingImage]);
            setIsForwardModalOpen(true);
        };

        const handleOpenWith = async (e) => {
            e.stopPropagation();
            if (!viewingImage || !viewingImage.file_path) return;

            const url = viewingImage.file_path;
            const fileName = viewingImage.fileName || 'image.jpg';

            if (navigator.share) {
                try {
                    // Try to share as a file first if possible
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const file = new File([blob], fileName, { type: blob.type });

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: fileName,
                            text: 'Check out this'
                        });
                    } else {
                        // Fallback to URL sharing
                        await navigator.share({
                            title: fileName,
                            text: 'Check out this',
                            url: url
                        });
                    }
                } catch (error) {
                    console.error('Error sharing:', error);
                    // Fallback to simpler share if file share fails
                    try {
                        await navigator.share({
                            title: fileName,
                            text: 'Check out this',
                            url: url
                        });
                    } catch (urlErr) {
                        console.error('URL share failed too', urlErr);
                    }
                }
            } else {
                setSnackbar({ message: 'Web Share API not supported on this browser', type: 'info' });
            }
        };

        // --- Crop Logic ---
        const startCrop = (e) => {
            e.stopPropagation();
            setIsCropping(true);
            // Default center crop
            setCropRect({ x: 20, y: 20, width: 60, height: 60 });
        };

        const cancelCrop = (e) => {
            e.stopPropagation();
            setIsCropping(false);
            setCropRect(null);
        };

        const applyCrop = async (e) => {
            e.stopPropagation();
            if (!imageRef.current || !cropRect) return;

            try {
                const img = imageRef.current;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate actual pixel coordinates
                const naturalWidth = img.naturalWidth;
                const naturalHeight = img.naturalHeight;

                const cropX = (cropRect.x / 100) * naturalWidth;
                const cropY = (cropRect.y / 100) * naturalHeight;
                const cropW = (cropRect.width / 100) * naturalWidth;
                const cropH = (cropRect.height / 100) * naturalHeight;

                canvas.width = cropW;
                canvas.height = cropH;

                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                canvas.toBlob((blob) => {
                    const newUrl = URL.createObjectURL(blob);
                    // Update the viewing image with the new blob URL
                    // Note: This is a client-side only edit for visualization/sharing in this session
                    // To persist, we'd need to upload this new blob to the server
                    setViewingImage(prev => ({
                        ...prev,
                        file_path: newUrl,
                        content: 'Check out this cropped image!' // Optional indicator
                    }));
                    setIsCropping(false);
                    setCropRect(null);
                    setSnackbar({ message: 'Image cropped! (Client-side only)', type: 'success' });
                }, 'image/jpeg', 0.95);

            } catch (err) {
                console.error("Crop failed", err);
                setSnackbar({ message: "Failed to crop image", type: 'error' });
            }
        };

        const handleMouseDown = (e) => {
            if (!isCropping) return;
            e.stopPropagation();
            e.preventDefault();
            const containerBounds = containerRef.current.getBoundingClientRect();

            // Start drag
            setIsDragging(true);
            setDragStart({
                x: e.clientX,
                y: e.clientY,
                initialRect: { ...cropRect }
            });
        };

        const handleMouseMove = (e) => {
            if (!isCropping || !isDragging) return;
            e.stopPropagation();
            e.preventDefault();

            // Simple logic: Dragging the whole box for now.
            // Full resizing logic would require handles, which is complex for this snippet.
            // Implementing simplified "Drag to Move" for this iteration.

            if (dragStart) {
                const containerBounds = containerRef.current.getBoundingClientRect();
                const deltaXPixels = e.clientX - dragStart.x;
                const deltaYPixels = e.clientY - dragStart.y;

                const deltaXPercent = (deltaXPixels / containerBounds.width) * 100;
                const deltaYPercent = (deltaYPixels / containerBounds.height) * 100;

                let newX = dragStart.initialRect.x + deltaXPercent;
                let newY = dragStart.initialRect.y + deltaYPercent;

                // Clamp
                newX = Math.max(0, Math.min(newX, 100 - cropRect.width));
                newY = Math.max(0, Math.min(newY, 100 - cropRect.height));

                setCropRect(prev => ({ ...prev, x: newX, y: newY }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
        };


        const renderViewerContent = () => {
            if (viewingImage.type === 'image') {
                return (
                    <div
                        className="wa-image-container"
                        ref={containerRef}
                        style={{ position: 'relative' }} // Removed display: inline-block to allow CSS flex to work
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp} // Stop dragging if left
                    >
                        <img
                            src={viewingImage.file_path}
                            alt="Full view"
                            className="wa-full-image"
                            ref={imageRef}
                        />
                        {isCropping && cropRect && (
                            <div
                                className="wa-crop-overlay"
                                onMouseDown={handleMouseDown}
                                style={{
                                    left: `${cropRect.x}%`,
                                    top: `${cropRect.y}%`,
                                    width: `${cropRect.width}%`,
                                    height: `${cropRect.height}%`,
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' // Dim backdrop
                                }}
                            >
                                <div className="wa-crop-grid"></div>
                            </div>
                        )}
                    </div>
                );
            }
            if (viewingImage.type === 'video') {
                return (
                    <video controls autoPlay className="wa-full-image">
                        <source src={viewingImage.file_path} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
            }
            if (viewingImage.type === 'file') {
                const ext = (viewingImage.fileName || viewingImage.file_path).split('.').pop().toLowerCase();
                if (ext === 'pdf') {
                    return (
                        <iframe
                            src={`${viewingImage.file_path}#toolbar=0`}
                            style={{ width: '80%', height: '80%', background: 'white', border: 'none', borderRadius: 8 }}
                            title="PDF Preview"
                        />
                    );
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#54656f' }}>
                        <FileText size={120} strokeWidth={1} />
                        <span style={{ marginTop: 20, fontSize: 24, fontWeight: 500 }}>{viewingImage.fileName}</span>
                        <span style={{ marginTop: 8, fontSize: 16, opacity: 0.7 }}>{viewingImage.fileSize ? `${Math.ceil(viewingImage.fileSize / 1024)} kB` : 'Document'}</span>
                    </div>
                );
            }
            return null;
        };

        return (
            <div className="wa-image-viewer-overlay" onClick={() => setViewingImage(null)}>
                <div className="wa-viewer-header">
                    <div className="wa-viewer-user-info">
                        <div className="wa-avatar" style={{ width: 40, height: 40, marginRight: 12 }}>
                            <span>{selectedUser?.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '500' }}>{selectedUser?.name}</span>
                            <span style={{ fontSize: 13, color: '#667781' }}>{formatTime(viewingImage.created_at)}</span>
                        </div>
                    </div>
                    <div className="wa-viewer-actions">
                        {isCropping ? (
                            <>
                                <button className="wa-viewer-btn" onClick={applyCrop} title="Apply Crop">
                                    <Check size={20} color="#027EB5" />
                                </button>
                                <button className="wa-viewer-btn" onClick={cancelCrop} title="Cancel Crop">
                                    <X size={20} color="#ef5350" />
                                </button>
                            </>
                        ) : (
                            <>
                                {viewingImage.type === 'image' && (
                                    <button className="wa-viewer-btn" onClick={startCrop} title="Crop">
                                        <Crop size={20} />
                                    </button>
                                )}
                                <button className="wa-viewer-btn" onClick={handleOpenWith} title="Share/Edit">
                                    <Share2 size={20} />
                                </button>
                                <button className="wa-viewer-btn" onClick={handleViewerStar} title={viewingImage.is_starred ? "Unstar" : "Star"}>
                                    <Star size={20} fill={viewingImage.is_starred ? "#54656f" : "none"} />
                                </button>
                                <button className="wa-viewer-btn" onClick={handleViewerForward} title="Forward">
                                    <Forward size={20} />
                                </button>
                                <button className="wa-viewer-btn" onClick={(e) => { e.stopPropagation(); handleDownload(viewingImage.file_path, viewingImage.fileName); }} title="Download">
                                    <Download size={20} />
                                </button>
                                <button className="wa-viewer-btn" onClick={() => setViewingImage(null)} title="Close">
                                    <X size={24} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="wa-viewer-content" onClick={(e) => e.stopPropagation()}>
                    {currentIndex > 0 && !isCropping && (
                        <div className="wa-viewer-nav-btn prev" onClick={handlePrev}>
                            <ChevronLeft size={24} />
                        </div>
                    )}

                    {renderViewerContent()}

                    {currentIndex < viewableMsgs.length - 1 && currentIndex !== -1 && !isCropping && (
                        <div className="wa-viewer-nav-btn next" onClick={handleNext}>
                            <ChevronRight size={24} />
                        </div>
                    )}
                </div>

                {viewingImage.content && !isCropping && (
                    <div className="wa-viewer-footer">
                        <div className="wa-viewer-caption">{viewingImage.content}</div>
                    </div>
                )}

                {!isCropping && (
                    <div className="wa-viewer-thumbnails" onClick={(e) => e.stopPropagation()}>
                        {viewableMsgs.filter(m => m.type === 'image' || m.type === 'video').map((msg) => (
                            <div
                                key={msg._id}
                                className={`wa-viewer-thumb ${msg._id === viewingImage._id ? 'active' : ''}`}
                                onClick={() => setViewingImage(msg)}
                            >
                                {msg.type === 'image' ? <img src={msg.file_path} alt="thumb" /> :
                                    <video src={msg.file_path} />
                                }
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const handleMsgDropdownOpen = (e, msgId) => {
        e.stopPropagation();
        // If click is in the bottom 60% of screen, show menu ABOVE (classic WhatsApp)
        const isBottomPart = e.clientY > window.innerHeight * 0.4;
        setOpenDropdown({
            type: 'msg',
            id: msgId,
            pos: isBottomPart ? 'up' : 'down'
        });
    };

    const renderDropdownMenu = (type, id, data) => {
        if (!openDropdown || openDropdown.type !== type || openDropdown.id !== id) return null;
        const isMe = data.sender_id === user.id || data.user_id === user.id;

        if (type === 'msg') {
            const isDeleted = data.is_deleted_by_user || data.is_deleted_by_admin;
            const posClass = openDropdown.pos === 'up' ? 'pos-up' : 'pos-down';
            return (
                <div className={`wa-dropdown-menu msg-dropdown ${posClass}`} onClick={(e) => e.stopPropagation()}>
                    <div className="wa-reactions-row">
                        <span>👍</span><span>❤️</span><span>😂</span><span>😮</span><span>😢</span><span>🙏</span><Plus size={20} />
                    </div>
                    <div className="wa-dropdown-divider"></div>

                    {!isDeleted && (
                        <>
                            {isMe && (
                                <div className="wa-dropdown-item" onClick={(e) => { e.stopPropagation(); setInfoMessage(data); setOpenDropdown(null); }}>
                                    <Info size={18} style={{ marginRight: 12 }} /> Message info
                                </div>
                            )}
                            <div className="wa-dropdown-item" onClick={() => { setReplyingTo(data); setOpenDropdown(null); }}>
                                <Reply size={18} style={{ marginRight: 12 }} /> Reply
                            </div>
                            <div className="wa-dropdown-item" onClick={() => handleCopyMessage(data)}>
                                <Copy size={18} style={{ marginRight: 12 }} /> Copy
                            </div>
                            <div className="wa-dropdown-item" onClick={() => {
                                setIsForwardingMode(true);
                                setIsChatSelectionMode(false);
                                setForwardSelectedMsgs([data]);
                                setOpenDropdown(null);
                            }}>
                                <Forward size={18} style={{ marginRight: 12 }} /> Forward
                            </div>
                            <div className="wa-dropdown-item"><Pin size={18} style={{ marginRight: 12 }} /> Pin</div>

                            <div className="wa-dropdown-item" onClick={() => handleToggleStar(id, data.is_starred)}>
                                <Star size={18} style={{ marginRight: 12 }} fill={data.is_starred ? "#8696a0" : "none"} /> {data.is_starred ? 'Unstar' : 'Star'}
                            </div>

                            <div className="wa-dropdown-divider"></div>
                        </>
                    )}

                    <div className="wa-dropdown-item" onClick={() => {
                        setIsForwardingMode(true);
                        setIsChatSelectionMode(true);
                        setForwardSelectedMsgs([data]);
                        setOpenDropdown(null);
                    }}>
                        <CheckSquare size={18} style={{ marginRight: 12 }} /> Select
                    </div>

                    <div className="wa-dropdown-divider"></div>
                    {!isMe && !isDeleted && <div className="wa-dropdown-item"><ThumbsDown size={18} style={{ marginRight: 12 }} /> Report</div>}
                    {!isDeleted && (data.type === 'image' || data.type === 'file' || data.type === 'video' || data.type === 'audio') && (
                        <div className="wa-dropdown-item" onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(null);
                            handleDownload(data.file_path, data.fileName);
                        }}>
                            <Download size={18} style={{ marginRight: 12 }} /> Save as
                        </div>
                    )}

                    <div className="wa-dropdown-item delete" onClick={() => handleDeleteClick(id)}>
                        <Trash2 size={18} style={{ marginRight: 12 }} /> Delete
                    </div>
                </div>
            );
        }

        if (type === 'contact') {
            const isGroup = !!data.isGroup || (data.members !== undefined);
            const displayName = data.name || (isGroup ? 'Unnamed Group' : 'User');

            return (
                <div className="wa-dropdown-menu contact-dropdown" onClick={(e) => e.stopPropagation()}>
                    {archivedChatIds.includes(id) ? (
                        <div className="wa-dropdown-item" onClick={() => handleUnarchiveChat(id, displayName)}>
                            <Archive size={18} style={{ marginRight: 12 }} /> Unarchive chat
                        </div>
                    ) : (
                        <div className="wa-dropdown-item" onClick={() => handleArchiveChat(id, displayName)}>
                            <Archive size={18} style={{ marginRight: 12 }} /> Archive chat
                        </div>
                    )}
                    {data.isMuted ? (
                        <div className="wa-dropdown-item" onClick={() => handleUnmuteAction(id, displayName)}>
                            <BellOff size={18} style={{ marginRight: 12, color: '#8696a0' }} /> Unmute notifications
                        </div>
                    ) : (
                        <div className="wa-dropdown-item" onClick={() => { setMuteTargetUser({ id, name: displayName }); setIsMuteModalOpen(true); setOpenDropdown(null); }}>
                            <BellOff size={18} style={{ marginRight: 12 }} /> Mute notifications
                        </div>
                    )}
                    <div className="wa-dropdown-item" onClick={() => handleTogglePinChat(id)}>
                        <Pin size={18} style={{ marginRight: 12, transform: data.isPinned ? 'rotate(45deg)' : 'none' }} /> {data.isPinned ? 'Unpin chat' : 'Pin chat'}
                    </div>
                    {!isGroup && (
                        <div className="wa-dropdown-item" onClick={() => handleMarkAsUnread(id)}>
                            <MessageSquare size={18} style={{ marginRight: 12 }} /> Mark as unread
                        </div>
                    )}
                    {isGroup && (
                        <div className="wa-dropdown-item" onClick={() => {
                            setGroups(prev => prev.map(g => g._id === id ? { ...g, unreadCount: (g.unreadCount || 0) + 1 } : g));
                            setOpenDropdown(null);
                        }}>
                            <MessageSquare size={18} style={{ marginRight: 12 }} /> Mark as unread
                        </div>
                    )}
                    <div className="wa-dropdown-item" onClick={() => handleToggleFavorite(id, data.isFavorite)}>
                        {data.isFavorite ? <HeartOff size={18} style={{ marginRight: 12 }} /> : <Heart size={18} style={{ marginRight: 12 }} />}
                        {data.isFavorite ? 'Remove favourite' : 'Add to favourites'}
                    </div>
                    <div className="wa-dropdown-item"><XCircle size={18} style={{ marginRight: 12 }} /> Close chat</div>
                    <div className="wa-dropdown-divider"></div>
                    {!isGroup && <div className="wa-dropdown-item">Block</div>}
                    {isGroup && <div className="wa-dropdown-item">Exit group</div>}
                    <div className="wa-dropdown-item delete" onClick={() => {
                        // Implement delete chat for group (exit then delete or just delete local)
                        if (isGroup) {
                            setGroups(prev => prev.filter(g => g._id !== id));
                        } else {
                            setUsers(prev => prev.filter(u => u._id !== id));
                        }
                        setOpenDropdown(null);
                        if ((selectedUser && selectedUser._id === id) || (selectedGroup && selectedGroup._id === id)) {
                            handleBackToChatList();
                        }
                    }}>
                        <Trash2 size={18} style={{ marginRight: 12 }} /> {isGroup ? 'Delete group' : 'Delete chat'}
                    </div>
                </div>
            );
        }
    };

    const renderNotificationSettingsPanel = () => {
        if (!selectedUser) return null;

        return (
            <div className={`wa-contact-info-panel notification-settings-panel ${isNotificationSettingsOpen ? 'active' : ''}`}>
                <div className="wa-contact-info-header" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '16px', zIndex: 10 }}>
                            <button
                                className="wa-panel-back-btn"
                                onClick={() => {
                                    setIsNotificationSettingsOpen(false);
                                    setIsContactInfoOpen(true);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#027EB5', fontSize: '16px', fontWeight: 500, padding: 0 }}
                            >
                                Back
                            </button>
                        </div>
                        <span className="wa-contact-info-title" style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 17, fontWeight: 500, color: '#3b4a54', pointerEvents: 'none' }}>
                            Mute Notifications
                        </span>
                        <div style={{ width: 60 }} /> {/* Spacer */}
                    </div>
                </div>

                <div className="wa-contact-info-content">
                    <div className="wa-notification-section">
                        <div className="wa-section-header">Messages</div>

                        <div className="wa-settings-list">
                            <div className="wa-setting-row">
                                <div className="wa-setting-label">Mute notifications</div>
                                <div
                                    className={`wa-toggle-switch ${selectedUser.isMuted ? 'active' : ''}`}
                                    onClick={() => {
                                        if (selectedUser.isMuted) {
                                            handleUnmuteAction(selectedUser._id, selectedUser.name);
                                        } else {
                                            setMuteTargetUser({ id: selectedUser._id, name: selectedUser.name });
                                            setIsMuteModalOpen(true);
                                        }
                                    }}
                                >
                                    <div className="wa-toggle-thumb"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderEditContactPanel = () => {
        if (!selectedUser) return null;

        return (
            <div className={`wa-contact-info-panel edit-panel ${isEditContactOpen ? 'active' : ''}`} style={{ boxSizing: 'border-box' }}>
                <div className="wa-contact-info-header" style={{ height: 60, padding: '5px 15px', display: 'grid', gridTemplateColumns: 'minmax(60px, auto) 1fr minmax(60px, auto)', alignItems: 'center', background: '#f0f2f5', borderBottom: '1px solid #d1d7db', boxSizing: 'border-box' }}>
                    <button
                        onClick={() => setIsEditContactOpen(false)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#027EB5', justifySelf: 'start' }}
                    >
                        <span style={{ fontSize: 16, fontWeight: 500 }}>Back</span>
                    </button>
                    <span style={{ fontSize: 16, fontWeight: 500, color: '#111b21', textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>Edit contact</span>
                    <div style={{ width: 60 }} /> {/* Spacer to balance the Close button */}
                </div>

                <div className="wa-contact-info-content" style={{ background: 'white', overflowX: 'visible' }}>
                    <div style={{ padding: '28px 20px', boxSizing: 'border-box' }}>

                        {/* Name Fields */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 35 }}>
                            <div style={{ marginRight: 24, marginTop: 22 }}>
                                <UserIcon size={22} color="#8696a0" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="wa-edit-field-group">
                                    <label className="wa-edit-label">First name</label>
                                    <input
                                        type="text"
                                        className="wa-edit-input"
                                        value={editFirstName}
                                        onChange={(e) => setEditFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="wa-edit-field-group" style={{ marginTop: 24 }}>
                                    <label className="wa-edit-label">Last name</label>
                                    <input
                                        type="text"
                                        className="wa-edit-input"
                                        placeholder=""
                                        value={editLastName}
                                        onChange={(e) => setEditLastName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Phone Fields */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 25 }}>
                            <div style={{ marginRight: 24, marginTop: 22 }}>
                                <Phone size={22} color="#8696a0" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="wa-edit-field-group" style={{ width: '120px', position: 'relative' }}>
                                        <label className="wa-edit-label">Country</label>
                                        <div
                                            className="wa-edit-input wa-country-select"
                                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                                        >
                                            <span>{editCountry.code} {editCountry.dial}</span>
                                            <ChevronDown size={18} color="#8696a0" />
                                        </div>

                                        {isCountryDropdownOpen && (
                                            <div className="wa-country-dropdown">
                                                {countries.map(c => (
                                                    <div
                                                        key={c.code}
                                                        className="wa-country-item"
                                                        onClick={() => {
                                                            setEditCountry(c);
                                                            setIsCountryDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span style={{ marginRight: 10 }}>{c.flag}</span>
                                                        <span style={{ flex: 1 }}>{c.name}</span>
                                                        <span style={{ color: '#8696a0' }}>{c.dial}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="wa-edit-field-group" style={{ flex: 1 }}>
                                        <label className="wa-edit-label">Phone</label>
                                        <input
                                            type="text"
                                            className="wa-edit-input"
                                            value={editPhone}
                                            maxLength={10}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                if (val.length <= 10) setEditPhone(val);
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: '#667781', marginTop: 12 }}>
                                    This phone number is on WhatsApp.
                                </div>
                            </div>
                        </div>

                        {/* Sync Toggle */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 35 }}>
                            <div style={{ marginRight: 24, marginTop: 4 }}>
                                <CircleDashed size={22} color="#8696a0" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: 16, color: '#111b21' }}>Sync contact to phone</div>
                                        <div style={{ fontSize: 13, color: '#667781', marginTop: 4, lineHeight: 1.4 }}>
                                            This contact will be added to your phone's address book.
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setIsSyncEnabled(!isSyncEnabled)}
                                        style={{
                                            width: 40, height: 20, borderRadius: 10,
                                            background: isSyncEnabled ? '#027EB5' : '#8696a0',
                                            position: 'relative', cursor: 'pointer', transition: '0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: 14, height: 14, borderRadius: '50%', background: 'white',
                                            position: 'absolute', top: 3, left: isSyncEnabled ? 23 : 3, transition: '0.3s'
                                        }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit FAB */}
                    <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)' }}>
                        <button
                            className="wa-edit-fab"
                            onClick={async () => {
                                const newName = `${editFirstName} ${editLastName}`.trim() || selectedUser.name;
                                try {
                                    const token = localStorage.getItem('token');
                                    await axios.post('/api/chat/user/update', {
                                        targetUserId: selectedUser._id,
                                        name: newName,
                                        mobile: editPhone
                                    }, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });

                                    // Update Selected User
                                    setSelectedUser(prev => ({ ...prev, name: newName, mobile: editPhone, country: editCountry }));
                                    // Update Users List
                                    setUsers(prev => prev.map(u => u._id === selectedUser._id ? { ...u, name: newName, mobile: editPhone } : u));
                                    // Close Panel
                                    setIsEditContactOpen(false);
                                    setSnackbar({ message: 'Profile Updated successfully', type: 'success', variant: 'system' });
                                } catch (err) {
                                    console.error("Failed to update contact", err);
                                    setSnackbar({ message: 'Failed to update contact', type: 'error' });
                                }
                            }}
                        >
                            <CheckCheck size={32} color="white" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderChatContextMenu = () => {
        if (!chatContextMenu) return null;

        return (
            <div
                className="wa-chat-context-menu"
                style={{ top: chatContextMenu.y, left: chatContextMenu.x }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="wa-dropdown-item" onClick={() => {
                    setIsForwardingMode(true);
                    setIsChatSelectionMode(true);
                    setChatContextMenu(null);
                }}>
                    <CheckSquare size={18} style={{ marginRight: 12 }} /> Select messages
                </div>
                <div className="wa-dropdown-item" onClick={() => {
                    setSelectedUser(null);
                    setChatContextMenu(null);
                    setIsForwardingMode(false);
                    setIsChatSelectionMode(false);
                    setForwardSelectedMsgs([]);
                }}>
                    <XCircle size={18} style={{ marginRight: 12 }} /> Close chat
                </div>
            </div>
        );
    };

    const renderSharedMediaPanel = () => {
        if (!selectedUser) return null;

        // Filter messages for this chat
        const chatMsgs = messages.filter(m =>
            (String(m.sender_id) === String(selectedUser._id) && String(m.receiver_id) === String(user.id || user._id)) ||
            (String(m.sender_id) === String(user.id || user._id) && String(m.receiver_id) === String(selectedUser._id)) ||
            (String(m.user_id) === String(user.id || user._id) && String(m.receiver_id) === String(selectedUser._id)) ||
            (String(m.user_id) === String(selectedUser._id) && String(m.receiver_id) === String(user.id || user._id))
        );

        const mediaMsgs = chatMsgs.filter(m => m.type === 'image' || m.type === 'video');
        const docMsgs = chatMsgs.filter(m => m.type === 'file');
        const linkMsgs = chatMsgs.filter(m => m.link_preview && m.link_preview.url);

        const currentItems = sharedMediaTab === 'media' ? mediaMsgs : (sharedMediaTab === 'docs' ? docMsgs : linkMsgs);
        const isSelectionMode = selectedMediaMsgs.length > 0;

        const toggleSelection = (msg) => {
            setSelectedMediaMsgs(prev =>
                prev.find(m => m._id === msg._id)
                    ? prev.filter(m => m._id !== msg._id)
                    : [...prev, msg]
            );
        };

        const formatSharedMediaTimestamp = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

            if (diffDays === 0 && date.getDate() === now.getDate()) {
                return timeStr;
            } else if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
                return `Yesterday, ${timeStr}`;
            } else {
                const datePart = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
                return `${datePart}, ${timeStr}`;
            }
        };

        return (
            <div className={`wa-contact-info-panel shared-media-panel ${isSharedMediaOpen ? 'active' : ''}`}>
                <div className="wa-contact-info-header" style={{ background: '#fff', borderBottom: 'none', height: 60, display: 'flex', alignItems: 'center', padding: '0 15px' }}>
                    {isSelectionMode ? (
                        <div className="wa-selection-header-grid">
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <button onClick={() => setSelectedMediaMsgs([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#027EB5', fontSize: '16px', fontWeight: 500, padding: 0, width: 'auto' }}>
                                    {t('lang_confirm.cancel')}
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <span style={{ fontSize: 18, fontWeight: 500, whiteSpace: 'nowrap' }}>{t('chat_window.selected_count', { count: selectedMediaMsgs.length })}</span>
                            </div>
                            <div className="wa-selection-header-actions">
                                <Copy size={22} color="#54656f" className="wa-copy-icon-mobile" style={{ cursor: 'pointer' }} onClick={handleBulkCopy} />
                                <Star size={22} color="#54656f" style={{ cursor: 'pointer' }} onClick={handleBulkStar} />
                                <Trash2 size={22} color="#54656f" style={{ cursor: 'pointer' }} onClick={handleBulkDelete} />
                                <Forward size={22} color="#54656f" style={{ cursor: 'pointer' }} onClick={handleBulkForward} />
                            </div>
                        </div>
                    ) : <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', width: '100%', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '8px' }}>
                            <button onClick={() => setIsSharedMediaOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#027EB5', fontSize: '16px', fontWeight: 500, padding: 0 }}>
                                {t('chat_window.back')}
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                            <span style={{ fontSize: 16, fontWeight: 500, color: '#3b4a54', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('contact_info.media_links_docs')}</span>
                        </div>
                        <div /> {/* Spacer */}
                    </div>
                    }
                </div>

                {!isSelectionMode && (
                    <div className="wa-media-tabs">
                        {['media', 'docs', 'links'].map(tab => {
                            const count = tab === 'media' ? mediaMsgs.length :
                                tab === 'docs' ? docMsgs.length :
                                    linkMsgs.length;
                            return (
                                <div
                                    key={tab}
                                    className={`wa-media-tab ${sharedMediaTab === tab ? 'active' : ''}`}
                                    onClick={() => setSharedMediaTab(tab)}
                                >
                                    <div>{t(`shared_media.tabs.${tab}`)}</div>
                                    <div className="wa-tab-count">{count}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="wa-contact-info-content" style={{ background: '#fff' }}>
                    {currentItems.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8696a0', padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 14 }}>{t('chat_window.no_media_shared', { tab: t(`shared_media.tabs.${sharedMediaTab}`) })}</div>
                        </div>
                    ) : (
                        <div style={{ padding: '15px' }}>
                            {sharedMediaTab === 'media' && (
                                <div className="wa-media-grid">
                                    {currentItems.map(msg => {
                                        const isSelected = !!selectedMediaMsgs.find(m => m._id === msg._id);
                                        const isAnySelected = selectedMediaMsgs.length > 0;

                                        return (
                                            <div key={msg._id} className="wa-media-grid-item" onClick={(e) => {
                                                e.stopPropagation();
                                                if (isAnySelected) {
                                                    toggleSelection(msg);
                                                } else {
                                                    // Mobile: Lightbox. Desktop: Redirect THEN Lightbox.
                                                    if (window.innerWidth > 768) {
                                                        handleSearchClick(msg._id);
                                                        // Delay opening to allow scroll to finish
                                                        setTimeout(() => setViewingImage(msg), 600);
                                                    } else {
                                                        setViewingImage(msg);
                                                    }
                                                }
                                            }}>
                                                <img src={msg.file_path} alt="media" />
                                                <div
                                                    className={`wa-media-overlay ${isSelected ? 'selected' : ''}`}
                                                    style={{ background: isSelected ? 'rgba(0,0,0,0.4)' : undefined }}
                                                >
                                                    <div
                                                        className="wa-media-select-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSelection(msg);
                                                        }}
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare size={24} color="white" fill="#027EB5" />
                                                        ) : (
                                                            <div style={{ width: 24, height: 24, border: '2px solid white', borderRadius: 4, background: 'rgba(0,0,0,0.1)' }} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {sharedMediaTab === 'docs' && (
                                <div className="wa-docs-list">
                                    {currentItems.map(msg => (
                                        <div key={msg._id} className="wa-doc-list-item">
                                            <div
                                                className={`wa-doc-select-box ${selectedMediaMsgs.find(m => m._id === msg._id) ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(msg); }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {selectedMediaMsgs.find(m => m._id === msg._id) ? (
                                                    <CheckCheck size={14} color="#fff" />
                                                ) : (
                                                    <div className="wa-doc-checkbox-placeholder" />
                                                )}
                                            </div>
                                            <div
                                                className="wa-doc-content-wrapper"
                                                style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer' }}
                                                onClick={() => {
                                                    // Mobile: Download. Desktop: Redirect THEN Download.
                                                    if (window.innerWidth > 768) {
                                                        handleSearchClick(msg._id);
                                                        setTimeout(() => handleDownload(msg.file_path, msg.fileName), 600);
                                                    } else {
                                                        handleDownload(msg.file_path, msg.fileName);
                                                    }
                                                }}
                                            >
                                                <div className="wa-doc-icon-small">
                                                    <FileText size={24} color="#e53935" strokeWidth={1.5} />
                                                </div>
                                                <div className="wa-doc-info">
                                                    <div className="wa-doc-name-small">{msg.fileName || 'Document.pdf'}</div>
                                                    <div className="wa-doc-meta-small">
                                                        {msg.fileSize ? Math.ceil(msg.fileSize / 1024) + ' kB' : ''} • {msg.fileName?.split('.').pop()?.toUpperCase() || 'PDF'} • {formatSharedMediaTimestamp(msg.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sharedMediaTab === 'links' && (
                                <div className="wa-links-list">
                                    {currentItems.map(msg => (
                                        <div key={msg._id} className="wa-link-list-item">
                                            <div
                                                className={`wa-doc-select-box ${selectedMediaMsgs.find(m => m._id === msg._id) ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(msg); }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {selectedMediaMsgs.find(m => m._id === msg._id) ? (
                                                    <CheckCheck size={18} color="#fff" />
                                                ) : (
                                                    <div className="wa-doc-checkbox-placeholder" />
                                                )}
                                            </div>
                                            <a
                                                className={`wa-link-card-small ${getYouTubeVideoId(msg.link_preview?.url || msg.content) ? 'youtube' : ''}`}
                                                href={msg.link_preview?.url || msg.content}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    // If they clicked the blue URL text directly, DON'T redirect, just open immediately.
                                                    if (e.target.closest('.wa-link-url-small')) {
                                                        return; // Let native <a> behavior handle it
                                                    }

                                                    // Desktop: Redirect THEN Open Link.
                                                    if (window.innerWidth > 768) {
                                                        e.preventDefault();
                                                        handleSearchClick(msg._id);
                                                        setTimeout(() => window.open(msg.link_preview?.url || msg.content, '_blank'), 600);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}
                                            >
                                                <div className="wa-link-header-small">
                                                    <span className="wa-link-author">{msg.sender_id === user.id || msg.user_id === user.id ? 'You' : (selectedUser.name || 'User')}</span>
                                                    <span className="wa-link-time-small">{formatSharedMediaTimestamp(msg.created_at)}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 10 }}>
                                                    {msg.link_preview.image && (
                                                        <div className="wa-link-thumb-small-wrapper">
                                                            <img src={msg.link_preview.image} alt="preview" className="wa-link-thumb-small" />
                                                            {getYouTubeVideoId(msg.link_preview?.url || msg.content) && (
                                                                <div
                                                                    className="wa-yt-preview-overlay-small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        e.preventDefault();
                                                                        setPreviewVideoUrl(msg.link_preview?.url || msg.content);
                                                                    }}
                                                                >
                                                                    <Play size={16} color="white" fill="white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="wa-link-details-small">
                                                        <div className="wa-link-title-small">{msg.link_preview?.title}</div>
                                                        <div className="wa-link-url-small" style={{ wordBreak: 'break-all' }}>{msg.link_preview?.url || msg.content}</div>
                                                    </div>
                                                </div>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    const totalUnread = users.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0) + groups.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
    const totalActiveUnread = users.filter(u => !archivedChatIds.includes(u._id)).reduce((acc, curr) => acc + (curr.unreadCount || 0), 0) + groups.filter(g => !archivedChatIds.includes(g._id)).reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
    const totalUnreadArchived = users.filter(u => archivedChatIds.includes(u._id) && (u.unreadCount || 0) > 0).length + groups.filter(g => archivedChatIds.includes(g._id) && (g.unreadCount || 0) > 0).length;
    const totalFavorites = users.filter(u => u.isFavorite && !archivedChatIds.includes(u._id)).length + groups.filter(g => g.isFavorite && !archivedChatIds.includes(g._id)).length;


    const handleMouseDownResize = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = leftPanelWidth;

        const handleMouseMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const maxWidth = window.innerWidth / 2;
            setLeftPanelWidth(Math.max(260, Math.min(maxWidth, startWidth + delta)));
        };

        const handleMouseUp = () => {
            document.body.style.cursor = 'default';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderLeftPanel = () => (
        <div className="wa-left-panel" style={{ width: leftPanelWidth, minWidth: 260, maxWidth: window.innerWidth / 2, flex: 'none', position: 'relative', overflow: 'hidden' }}>
            {/* Drawers */}
            {isProfileOpen && renderProfileDrawer()}
            {isNewChatOpen && renderNewChatDrawer()}
            {isPhoneNumberPanelOpen && renderPhoneNumberPanel()}
            {isNewGroupOpen && renderNewGroupDrawer()}
            {isArchivedChatsOpen && renderArchivedChatsDrawer()}
            {isGlobalStarredOpen && renderGlobalStarredDrawer()}


            {/* Chat List Header */}
            <div className="wa-header" style={{ background: 'white' }}>
                <span className="wa-header-title">{t('chat_list.title')}</span>
                <div className="wa-header-icons">
                    <button className="wa-nav-icon-btn" title="Notifications">
                        <Bell size={20} />
                        {totalUnread > 0 && <span className="wa-bell-badge">{totalUnread}</span>}
                    </button>
                    <button className="wa-nav-icon-btn" title="New Chat" onClick={(e) => { e.stopPropagation(); setIsNewChatOpen(true); }}><Plus size={20} /></button>
                    <button
                        className="wa-nav-icon-btn"
                        title="Menu"
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    >
                        <MoreVertical size={20} />
                    </button>
                    {/* Simple Menu Dropdown */}
                    {showMenu && (
                        <div className="wa-menu-dropdown">
                            <div className="wa-menu-item" onClick={logout}>Log out</div>
                            <div className="wa-menu-item" onClick={(e) => { e.stopPropagation(); setIsNewGroupOpen(true); setShowMenu(false); }}>New group</div>

                            <div className="wa-menu-item" onClick={(e) => { e.stopPropagation(); setIsGlobalStarredOpen(true); setShowMenu(false); }}>Starred messages</div>
                            <div className="wa-menu-item" onClick={() => { setIsArchivedChatsOpen(true); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                <Archive size={18} style={{ marginRight: 12, flexShrink: 0 }} />
                                <span style={{ flex: 1 }}>{t('chat_list.archived')}</span>
                                {totalUnreadArchived > 0 && <span style={{ background: '#25d366', color: '#111b21', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', marginLeft: 8, flexShrink: 0 }}>{totalUnreadArchived}</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Search */}
            <div className="wa-search-section">
                <div className="wa-search-bar">
                    <Search size={18} color="#54656f" />
                    <input
                        type="text"
                        placeholder={t('chat_list.search_placeholder')}
                        className="wa-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>


            </div>

            {/* Unread Notifications Banner */}
            {totalUnread > 0 && showUnreadBanner && (
                <div style={{
                    margin: '0 12px 10px',
                    padding: '10px 12px',
                    background: '#e7f5ff',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    color: '#027EB5'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 8 }}>×</span> {/* Or use an icon like X from lucide-react if preferred, using text x as per request 'x You have {n}...' */}
                        {t('chat_list.unread_notifications', { count: totalUnread })}
                    </div>
                    {/* Close button implementation if needed, but request implies the 'x' is at the start */}
                    {/* Based on drawing: "x You have {3} new notifications" */}
                    {/* I will implement it as clickable X icon at the start to dismiss, or just static text if that's what the drawing means. 
                        Drawing shows 'x' at the start. It usually implies dismissal. 
                        Let's make the whole banner dismissible or just the 'x'. 
                     */}
                </div>
            )}

            {/* Filters */}
            <div className={`wa-filters ${leftPanelWidth < 380 ? 'compact' : ''}`} ref={filtersRef}>
                <button
                    className={`wa-filter-pill ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    {t('chat_list.filter_all')}
                </button>
                <button
                    className={`wa-filter-pill ${filterType === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilterType('unread')}
                >
                    {t('chat_list.filter_unread')} {totalActiveUnread > 0 && <span className="wa-pill-count">{totalActiveUnread}</span>}
                </button>
                <button
                    className={`wa-filter-pill ${filterType === 'favorites' ? 'active' : ''}`}
                    onClick={() => setFilterType('favorites')}
                >
                    {t('chat_list.filter_favorites')} {totalFavorites > 0 && <span className="wa-pill-count">{totalFavorites}</span>}
                </button>
                <button
                    className={`wa-filter-pill ${filterType === 'groups' ? 'active' : ''}`}
                    onClick={() => setFilterType('groups')}
                >
                    {t('chat_list.filter_groups')} {groups.filter(g => g.unreadCount > 0).length > 0 && <span className="wa-pill-count">{groups.filter(g => g.unreadCount > 0).length}</span>}
                </button>
                <button className="wa-nav-icon-btn wa-filter-plus-btn"><Plus size={18} /></button>
            </div>

            {/* Chat List: Groups + Users combined */}
            <div className="wa-user-list">
                {!isDataLoaded ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#8696a0' }}>
                        <CircleDashed size={24} className="wa-spinner" style={{ animation: 'waSpinner 1s linear infinite' }} />
                        <style>{`@keyframes waSpinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <>
                        {/* Unified Chat List: Groups + Users mixed by Pinned status and Date */}
                        {[...groups.map(g => ({ ...g, is_group: true })), ...users.map(u => ({ ...u, is_group: false }))]
                            .filter(item => {
                                const displayName = item.name || (item.is_group ? 'Unnamed Group' : 'User');
                                const contentPart = item.lastMessage?.content || '';
                                const nameMatch = displayName.toLowerCase().includes(searchQuery.toLowerCase());
                                const msgMatch = contentPart.toLowerCase().includes(searchQuery.toLowerCase());
                                const matchesSearch = nameMatch || msgMatch;

                                if (archivedChatIds.includes(item._id)) return false;
                                if (filterType === 'all') return matchesSearch;
                                if (filterType === 'unread') return matchesSearch && (item.unreadCount > 0);
                                if (filterType === 'favorites') return matchesSearch && item.isFavorite;
                                if (filterType === 'groups') return matchesSearch && item.is_group;
                                return matchesSearch;
                            })
                            .sort((a, b) => {
                                // Pinned always first
                                if (a.isPinned && !b.isPinned) return -1;
                                if (!a.isPinned && b.isPinned) return 1;
                                // Then by date
                                return new Date(b.lastMessage?.created_at || b.created_at) - new Date(a.lastMessage?.created_at || a.created_at);
                            })
                            .map(item => {
                                const isGroup = item.is_group;
                                const displayName = item.name || (isGroup ? 'Unnamed Group' : 'User');

                                const renderHighlightedContent = (content) => {
                                    if (!searchQuery || !content) return content;
                                    const parts = content.split(new RegExp(`(${searchQuery})`, 'gi'));
                                    return parts.map((part, i) =>
                                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                                            <span key={i} style={{ background: '#ffef96', color: 'black' }}>{part}</span>
                                        ) : (part)
                                    );
                                };

                                return (
                                    <div
                                        key={item._id}
                                        className={`wa-user-item ${((isGroup && selectedGroup?._id === item._id) || (!isGroup && selectedUser?._id === item._id)) ? 'active' : ''}`}
                                        onClick={() => {
                                            if (isGroup) {
                                                setSelectedGroup(item);
                                                setSelectedUser(null);
                                                fetchGroupMessages(item._id);
                                                setGroups(prev => prev.map(g => g._id === item._id ? { ...g, unreadCount: 0 } : g));
                                            } else {
                                                handleUserSelect(item);
                                                setSelectedGroup(null);
                                            }
                                        }}
                                        onContextMenu={(e) => { e.preventDefault(); setOpenDropdown({ type: 'contact', id: item._id }); }}
                                        onTouchStart={(e) => { e.persist(); longPressTimer.current = setTimeout(() => { setOpenDropdown({ type: 'contact', id: item._id }); }, 600); }}
                                        onTouchEnd={() => clearTimeout(longPressTimer.current)}
                                        onTouchMove={() => clearTimeout(longPressTimer.current)}
                                    >
                                        <div className="wa-avatar" style={isGroup ? { background: '#dfe5e7', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}>
                                            {isGroup ? (
                                                item.icon ? (
                                                    <img src={item.icon} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Camera size={22} color="#8696a0" />
                                                )
                                            ) : (
                                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#54656f' }}>
                                                    {displayName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="wa-chat-info">
                                            <div className="wa-chat-row-top">
                                                <span className="wa-chat-name">{displayName}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span className="wa-chat-time">{formatTime(item.lastMessage?.created_at || item.created_at)}</span>
                                                    <div className="wa-dropdown-trigger" onClick={(e) => { e.stopPropagation(); setOpenDropdown({ type: 'contact', id: item._id }); }}>
                                                        <ChevronDown size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="wa-chat-row-bottom">
                                                <span className="wa-chat-last-msg">
                                                    {item.lastMessage?.is_deleted_by_admin ? (
                                                        <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                                                            <Trash2 size={12} style={{ marginRight: 4 }} /> This message was deleted by Admin
                                                        </span>
                                                    ) : item.lastMessage?.is_deleted_by_user ? (
                                                        <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                                                            <XCircle size={12} style={{ marginRight: 4 }} />
                                                            {String(item.lastMessage.sender_id) === String(user.id || user._id) ? 'You deleted this message' : 'This message was deleted'}
                                                        </span>
                                                    ) : (
                                                        item.lastMessage?.type === 'image' ? (isGroup ? '📷 Photo' : '📷 Image') :
                                                            item.lastMessage?.type === 'file' ? '📄 File' :
                                                                renderHighlightedContent(item.lastMessage?.content || (item.lastMessage?.is_system ? `${item.lastMessage.sender_id?.name || 'Someone'} ${item.lastMessage.content}` : 'No messages'))
                                                    )}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {item.isMuted && <BellOff size={14} color="#8696a0" />}
                                                    {item.isPinned && <Pin size={14} color="#8696a0" style={{ transform: 'rotate(45deg)' }} />}
                                                    {item.unreadCount > 0 && <div className="wa-unread-badge">{item.unreadCount}</div>}
                                                </div>
                                            </div>
                                            {renderDropdownMenu('contact', item._id, item)}
                                        </div>
                                    </div>
                                );
                            })}
                    </>
                )}
            </div>
            {/* Resize Handle */}
            <div
                className="wa-resize-handle"
                onMouseDown={handleMouseDownResize}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: -4,
                    width: 10,
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 100
                }}
            />
        </div>
    );

    const handleDownload = async (url, fileName) => {
        try {
            // Try using the File System Access API for a "Save As" dialog
            if ('showSaveFilePicker' in window) {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();

                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName || 'download',
                });

                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            }
            throw new Error('File System Access API not supported');
        } catch (err) {
            // Fallback or if user cancels the picker (AbortError)
            if (err.name !== 'AbortError') {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', fileName || 'download');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    const handlePaste = (e) => {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            const pastedFile = e.clipboardData.files[0];
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'mp4', 'avi', 'mkv', 'mov', 'webm'];
            const extension = pastedFile.name.split('.').pop().toLowerCase();

            if (allowedExtensions.includes(extension)) {
                if (pastedFile.size > 1073741824) {
                    setSnackbar({ message: 'File must be less than 1GB', type: 'error', variant: 'system' });
                } else {
                    setFile(pastedFile);
                }
            } else {
                setSnackbar({ message: 'Only JPG, JPEG, PNG, DOC, DOCX, PDF, Excel, and Video files are allowed.', type: 'error', variant: 'system' });
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'mp4', 'avi', 'mkv', 'mov', 'webm'];
            const extension = droppedFile.name.split('.').pop().toLowerCase();

            if (allowedExtensions.includes(extension)) {
                if (droppedFile.size > 1073741824) {
                    setSnackbar({ message: 'File must be less than 1GB', type: 'error', variant: 'system' });
                } else {
                    setFile(droppedFile);
                }
            } else {
                setSnackbar({ message: 'Only JPG, JPEG, PNG, DOC, DOCX, PDF, Excel, and Video files are allowed.', type: 'error', variant: 'system' });
            }
        }
    };

    const handleBackToChatList = () => {
        setSelectedUser(null);
        setInput('');
        setFile(null);
        setTypingLinkPreview(null);
        setReplyingTo(null);
        setIsChatSelectionMode(false);
        setIsForwardingMode(false);
        setForwardSelectedMsgs([]);
        setInfoMessage(null);
        setIsContactInfoOpen(false);
        setIsMessageSearchOpen(false);
        setIsStarredMessagesOpen(false);
        setIsSharedMediaOpen(false);
        setIsEditContactOpen(false);
    };

    const toggleForwardContact = (contact) => {
        const isSelected = selectedForwardContacts.find(c => c._id === contact._id);

        // Check if any selected message is "highly forwarded"
        const isHighlyForwarded = forwardSelectedMsgs.some(msg => (msg.forward_count || 0) >= 4);

        if (isSelected) {
            setSelectedForwardContacts(prev => prev.filter(c => c._id !== contact._id));
            setShowForwardLimitWarning(false);
        } else {
            // Restriction Logic
            if (isHighlyForwarded) {
                if (selectedForwardContacts.length >= 1) {
                    setSnackbar({ message: "Forwarded too many times.. Only 1 contact at a time", type: 'error' });
                    return; // Stop selection
                }
            } else {
                if (selectedForwardContacts.length >= 5) {
                    setShowForwardLimitWarning(true);
                    return; // Stop selection
                }
            }

            setSelectedForwardContacts(prev => [...prev, contact]);
            setShowForwardLimitWarning(false);
        }
    };

    const handleForwardSend = async () => {
        if (selectedForwardContacts.length === 0 || forwardSelectedMsgs.length === 0) return;

        // Optimistically close modal
        setIsForwardModalOpen(false);
        setIsForwardingMode(false);
        setForwardSelectedMsgs([]);
        setSelectedForwardContacts([]);
        setSelectedMediaMsgs([]); // Clear panel selection too after successful send initiation

        const token = localStorage.getItem('token');

        // Send logic
        for (const contact of selectedForwardContacts) {
            for (const msg of forwardSelectedMsgs) {
                try {
                    const isGroup = contact.isForwardGroup;
                    const endpoint = isGroup ? `/api/groups/${contact._id}/send` : '/api/chat/send';

                    const formData = isGroup ? {
                        content: msg.content || '',
                        type: msg.type || 'text',
                        file_path: msg.file_path,
                        fileName: msg.fileName,
                        fileSize: msg.fileSize,
                        isForwarded: true
                    } : new FormData();

                    if (!isGroup) {
                        formData.append('userId', user.id || user._id);
                        formData.append('toUserId', contact._id);
                        formData.append('content', msg.content || '');
                        if (msg.file_path) {
                            formData.append('file_path', msg.file_path);
                            formData.append('type', msg.type);
                            formData.append('fileName', msg.fileName || '');
                            formData.append('fileSize', msg.fileSize || 0);
                        } else {
                            formData.append('type', 'text');
                        }
                        formData.append('isForwarded', 'true');
                        formData.append('forward_count', msg.forward_count || 0);
                    }

                    // API Call
                    const res = await axios.post(endpoint, formData, {
                        headers: {
                            'Content-Type': isGroup ? 'application/json' : 'multipart/form-data',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const sentMsg = res.data.message;

                    // Optimistic update if active
                    if (!isGroup && selectedUser && contact._id === selectedUser._id) {
                        setMessages(prev => [...prev, sentMsg]);
                    } else if (isGroup && selectedGroup && contact._id === selectedGroup._id) {
                        setGroupMessages(prev => [...prev, sentMsg]);
                    }

                    // Emit socket
                    if (!isGroup) {
                        socket.emit('send_message', {
                            _id: sentMsg._id,
                            sender_id: user.id || user._id,
                            receiverId: contact._id,
                            content: sentMsg.content,
                            type: sentMsg.type,
                            file_path: sentMsg.file_path,
                            isForwarded: true,
                            created_at: sentMsg.created_at
                        });
                    } else {
                        socket.emit('send_group_message', {
                            groupId: contact._id,
                            message: sentMsg
                        });
                    }

                } catch (err) {
                    console.error("Forwarding failed for contact", contact._id, err);
                }
            }
        }
        // Refresh 
        fetchUsers();
        fetchGroups();
        setSnackbar({ message: 'Messages forwarded!', type: 'success', variant: 'system' });
    };

    const renderMuteModal = () => (
        <div className="wa-mute-modal-overlay" onClick={() => setIsMuteModalOpen(false)}>
            <div className="wa-mute-modal" onClick={(e) => e.stopPropagation()}>
                <div className="wa-mute-modal-content">
                    <div className="wa-mute-header-centered">
                        <div className="wa-mute-icon-wrapper">
                            <BellOff size={28} color="#0EA5BE" />
                        </div>
                        <h3>Mute notifications</h3>
                    </div>

                    <div className="wa-mute-body">
                        <div className="wa-mute-description-centered">
                            Other members will not see that you muted this chat, and you will still be notified if you are mentioned.
                        </div>

                        <div className="wa-mute-options-spaced">
                            {['8 hours', '1 week', 'Always'].map((duration) => (
                                <div
                                    key={duration}
                                    className="wa-mute-option-item"
                                    onClick={() => setMuteDuration(duration)}
                                >
                                    <div className={`wa-radio-circle-custom ${muteDuration === duration ? 'selected' : ''}`}>
                                        {muteDuration === duration && <div className="wa-radio-inner-custom" />}
                                    </div>
                                    <span>{duration}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="wa-mute-footer-centered">
                        <button className="wa-mute-btn-cancel" onClick={() => setIsMuteModalOpen(false)}>Cancel</button>
                        <button className="wa-mute-btn-confirm" onClick={handleMuteAction}>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    );
    const renderForwardModal = () => (
        <div className="wa-forward-modal-overlay">
            <div className="wa-forward-modal">
                <div className="wa-forward-modal-header">
                    <button className="wa-forward-modal-close-btn" onClick={() => { setIsForwardModalOpen(false); setSelectedForwardContacts([]); setShowForwardLimitWarning(false); }} style={{ width: 'auto', padding: '0 10px', fontSize: '16px', color: '#027EB5', fontWeight: 500 }}>
                        Close
                    </button>
                    <div className="wa-forward-modal-title">Forward message to...</div>
                </div>

                {showForwardLimitWarning && (
                    <div className="wa-forward-limit-banner">
                        <span>You can only share with up to 5 chats.</span>
                        <X size={16} onClick={() => setShowForwardLimitWarning(false)} style={{ cursor: 'pointer' }} />
                    </div>
                )}

                <div className="wa-forward-search">
                    <Search size={20} color="#54656f" />
                    <input
                        type="text"
                        placeholder="Search name or number"
                        value={forwardSearchQuery}
                        onChange={(e) => setForwardSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="wa-forward-contact-list">
                    <div className="wa-forward-section-title">Recent chats</div>
                    {[...users.filter(u => u._id !== user.id), ...groups.map(g => ({ ...g, isForwardGroup: true }))]
                        .filter(item => (item.name || '').toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                        .map(item => {
                            const isSelected = !!selectedForwardContacts.find(c => c._id === item._id);
                            const displayName = item.name || 'Group';
                            return (
                                <div key={item._id} className="wa-forward-contact-item" onClick={() => toggleForwardContact(item)}>
                                    <div className="wa-avatar" style={{ background: item.isForwardGroup ? '#dfe5e7' : undefined }}>
                                        {item.isForwardGroup ? (
                                            item.icon ? <img src={item.icon} alt="grp" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <Camera size={20} color="#8696a0" />
                                        ) : (
                                            <span>{displayName.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="wa-forward-contact-info">
                                        <div className="wa-contact-name">{displayName}</div>
                                        <div className="wa-contact-status">{item.isForwardGroup ? 'Group Chat' : (item.mobile || 'Available')}</div>
                                    </div>
                                    <div className={`wa-forward-checkbox ${isSelected ? 'selected' : ''}`}>
                                        {isSelected && <CheckCheck size={20} color="white" />}
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>

                {selectedForwardContacts.length > 0 && (
                    <div className="wa-forward-fab-container">
                        <div className="wa-forward-names-preview">
                            {selectedForwardContacts.map(c => c.name).join(', ')}
                        </div>
                        <button className="wa-forward-fab" onClick={handleForwardSend}>
                            <Send size={24} color="white" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCameraModals = () => {
        if (cameraModal === 'none') return null;

        return (
            <div className="wa-camera-overlay">
                {cameraModal === 'permission' && (
                    <div className="wa-camera-modal">
                        <h2>Allow camera</h2>
                        <p>
                            To take photos, NEUCHAT needs access to your computer's camera.
                        </p>
                        <div className="wa-camera-modal-actions">
                            <button className="wa-camera-btn deny" onClick={() => setCameraModal('blocked')}>Deny</button>
                            <button className="wa-camera-btn allow" onClick={startCamera}>Allow</button>
                        </div>
                    </div>
                )}

                {cameraModal === 'blocked' && (
                    <div className="wa-camera-modal">
                        <h2>Camera Access Denied. Allow Camera Access</h2>
                        <p>
                            To take photos, NEUCHAT needs access to your computer's camera.
                            Please go to your privacy settings and allow camera access for this app.
                            Click <a href="ms-settings:privacy-webcam" style={{ color: '#00a884', fontWeight: 'bold' }}>here</a> to open the settings.
                        </p>
                        <div className="wa-camera-modal-actions">
                            <button className="wa-camera-btn got-it" onClick={() => setCameraModal('none')}>OK, got it</button>
                        </div>
                    </div>
                )}

                {cameraModal === 'active' && (
                    <div className="wa-camera-active-container">
                        <div className="wa-camera-header" style={{ display: 'flex', alignItems: 'center', height: 60, padding: '0 16px' }}>
                            <button onClick={closeCamera} style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center', width: 40, padding: 0 }}>
                                <X size={24} />
                            </button>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                <span style={{ fontSize: 19, fontWeight: 500, whiteSpace: 'nowrap' }}>Capture photo</span>
                            </div>
                            <div style={{ width: 40 }}></div>
                        </div>
                        <div className="wa-camera-video-wrapper">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="wa-camera-live-video"
                            />
                        </div>
                        <div className="wa-camera-footer">
                            <button className="wa-camera-capture-btn" onClick={capturePhoto}>
                                <Camera size={32} />
                            </button>
                        </div>
                    </div>
                )}

                {cameraModal === 'adjust' && (
                    <div className="wa-camera-active-container wa-camera-adjust-view">
                        <div className="wa-camera-header" style={{ display: 'flex', alignItems: 'center', height: 60, padding: '0 16px', gap: 15 }}>
                            <button onClick={closeCamera} style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center', width: 24, padding: 0 }}>
                                <X size={24} />
                            </button>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: 18, fontWeight: 500, color: '#111b21', whiteSpace: 'nowrap' }}>Drag item to adjust</span>
                            </div>
                        </div>

                        <div
                            className="wa-camera-video-wrapper wa-crop-wrapper"
                            onMouseMove={handleImageDragMove}
                            onMouseDown={handleImageDragStart}
                            onMouseUp={handleImageDragEnd}
                            onMouseLeave={handleImageDragEnd}
                            onTouchMove={handleImageDragMove}
                            onTouchStart={handleImageDragStart}
                            onTouchEnd={handleImageDragEnd}
                        >
                            <div className="wa-crop-image-container">
                                <img
                                    src={capturedImage}
                                    alt="Captured"
                                    style={{
                                        transform: `translate(${imagePos.x}px, ${imagePos.y}px) scale(${imageScale})`,
                                        cursor: isDraggingImage ? 'grabbing' : 'grab',
                                        userSelect: 'none'
                                    }}
                                    draggable="false"
                                />
                            </div>

                            {/* The Masking Layer */}
                            <div className="wa-crop-mask">
                                <div className="wa-crop-circle"></div>
                            </div>

                            {/* Zoom Controls */}
                            <div className="wa-crop-zoom-controls">
                                <button onClick={() => handleZoom('in')}><Plus size={20} /></button>
                                <div className="wa-zoom-divider"></div>
                                <button onClick={() => handleZoom('out')}><Minus size={20} /></button>
                            </div>
                        </div>

                        {/* Footer with Retake and Confirm Buttons */}
                        <div className="wa-camera-footer wa-crop-footer">
                            <button className="wa-crop-retake-btn-footer" onClick={startCamera}>
                                Retake
                            </button>
                            <button className="wa-crop-confirm-btn-footer" onClick={handleConfirmPhoto}>
                                <Check size={32} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMainChat = () => (
        <div className="wa-main-chat-wrapper" style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            <div
                className={`wa-main-chat ${(isMessageSearchOpen || isContactInfoOpen || isStarredMessagesOpen || isSharedMediaOpen || isEditContactOpen || isNotificationSettingsOpen) ? 'wa-main-chat-with-panel' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                    flex: 1,
                    borderRight: (isMessageSearchOpen || isContactInfoOpen || isStarredMessagesOpen || isSharedMediaOpen || isEditContactOpen || isNotificationSettingsOpen) ? '1px solid #d1d7db' : 'none'
                }}
            >
                <NeuralBackground />
                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div className="wa-chat-header" style={{ background: 'white' }}>
                            <div className="wa-chat-header-user">
                                {/* Mobile Back Button */}
                                <button
                                    className="wa-nav-icon-btn mobile-back-btn"
                                    onClick={handleBackToChatList}
                                >
                                    <ArrowLeft size={24} />
                                </button>

                                <div className="wa-chat-header-user" onClick={() => setIsContactInfoOpen(true)}>
                                    <div className="wa-avatar" style={{ width: 40, height: 40, marginRight: 10 }}>
                                        <span style={{ fontSize: 16 }}>{selectedUser.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedUser.name}</span>
                                        <span style={{ fontSize: 12, color: '#667781' }}>{renderUserStatus(selectedUser)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="wa-header-icons">
                                <button className="wa-nav-icon-btn wa-header-call-icon"><Video size={20} /></button>
                                <button className="wa-nav-icon-btn wa-header-call-icon"><Phone size={20} /></button>
                                <button
                                    className={`wa-nav-icon-btn ${isMessageSearchOpen ? 'active' : ''}`}
                                    onClick={() => {
                                        if (isMessageSearchOpen) {
                                            setIsMessageSearchOpen(false);
                                        } else {
                                            setIsMessageSearchOpen(true);
                                            searchSource.current = 'chat_header';
                                        }
                                    }}
                                >
                                    <Search size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={chatMessagesRef}
                            className="wa-chat-messages-area"
                            onScroll={() => {
                                const el = chatMessagesRef.current;
                                if (!el) return;
                                const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                                setShowScrollBtn(distFromBottom > 80);
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setChatContextMenu({ x: e.clientX, y: e.clientY });
                            }}
                        >
                            {/* Flex spacer to push messages to the bottom when there are few of them */}
                            <div style={{ flex: '1 1 auto' }}></div>
                            {(() => {
                                // 1. Group messages by Date Label
                                const groupedMessages = [];
                                let currentGroup = null;

                                messages
                                    .filter(msg => {
                                        if (!messageSearchQuery) return true;
                                        return (msg.content || '').toLowerCase().includes(messageSearchQuery.toLowerCase());
                                    })
                                    .forEach((msg) => {
                                        const dateLabel = formatDateForSeparator(msg.created_at, t, getLangCode(selectedLanguage));
                                        if (!currentGroup || currentGroup.date !== dateLabel) {
                                            currentGroup = {
                                                date: dateLabel,
                                                msgs: []
                                            };
                                            groupedMessages.push(currentGroup);
                                        }
                                        currentGroup.msgs.push(msg);
                                    });

                                // 2. Render Groups
                                return groupedMessages.map((group, groupIdx) => (
                                    <div key={groupIdx} className="wa-date-group">
                                        {group.date && (
                                            <div className="wa-date-separator">
                                                <span>{group.date}</span>
                                            </div>
                                        )}
                                        <div className="wa-group-messages">
                                            {group.msgs.map((msg, msgIdx) => {
                                                const myId = user.id || user._id;
                                                // The provided snippet seems to be server-side code.
                                                // Assuming the intent was to add a client-side log for forward_count if available in msg.
                                                // If this was intended for a server-side file, please provide that file.
                                                if (msg.isForwarded || msg.is_forwarded) {
                                                    console.log('DEBUG: Client-side message. Forwarded:', msg.isForwarded || msg.is_forwarded, 'Forward Count:', msg.forward_count);
                                                }
                                                const isMe = (msg.sender_id === myId) || (msg.user_id === myId);

                                                // Helper to highlight text and make links clickable
                                                const renderContent = (content) => {
                                                    if (!content) return content;

                                                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                                                    const parts = content.split(urlRegex);

                                                    return parts.map((part, i) => {
                                                        // Check if part is a URL
                                                        if (urlRegex.test(part)) {
                                                            return (
                                                                <a
                                                                    key={i}
                                                                    href={part}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        color: '#027eb5',
                                                                        textDecoration: 'underline',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {part}
                                                                </a>
                                                            );
                                                        }

                                                        // Apply search highlighting if needed
                                                        if (messageSearchQuery) {
                                                            const searchParts = part.split(new RegExp(`(${messageSearchQuery})`, 'gi'));
                                                            return searchParts.map((searchPart, j) =>
                                                                searchPart.toLowerCase() === messageSearchQuery.toLowerCase() ? (
                                                                    <span key={`${i}-${j}`} style={{ background: '#ffef96', color: 'black' }}>{searchPart}</span>
                                                                ) : (
                                                                    searchPart
                                                                )
                                                            );
                                                        }

                                                        return part;
                                                    });
                                                };

                                                return (
                                                    <div key={msg.id || msgIdx}
                                                        id={`msg-${msg._id}`}
                                                        className={`wa-message-container ${isForwardingMode ? 'forward-mode' : ''}`}
                                                        onClick={() => {
                                                            if (isForwardingMode) {
                                                                const isSelected = forwardSelectedMsgs.find(m => (m._id || m.id) === (msg._id || msg.id));
                                                                if (isSelected) {
                                                                    setForwardSelectedMsgs(prev => prev.filter(m => (m._id || m.id) !== (msg._id || msg.id)));
                                                                } else {
                                                                    if (!msg._id) {
                                                                        setSnackbar({ message: "Please wait for message to sync before selecting", type: 'info' });
                                                                        return;
                                                                    }
                                                                    setForwardSelectedMsgs(prev => [...prev, msg]);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {isForwardingMode && (
                                                            <div className="wa-msg-checkbox">
                                                                {forwardSelectedMsgs.find(m => m._id === msg._id) ?
                                                                    <CheckSquare size={24} color="white" fill="#027EB5" /> :
                                                                    <div className="wa-checkbox-empty" />
                                                                }
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`wa-message-bubble ${isMe ? 'wa-msg-sent' : 'wa-msg-rec'} ${msg.link_preview ? 'has-link-preview' : ''}`}
                                                            onContextMenu={(e) => { if (!isForwardingMode) { e.preventDefault(); handleMsgDropdownOpen(e, msg._id); } }}
                                                            onTouchStart={(e) => { if (!isForwardingMode) { e.persist(); longPressTimer.current = setTimeout(() => { handleMsgDropdownOpen(e, msg._id); }, 600); } }}
                                                            onTouchEnd={() => clearTimeout(longPressTimer.current)}
                                                            onTouchMove={() => clearTimeout(longPressTimer.current)}
                                                        >
                                                            {(msg.isForwarded || msg.is_forwarded) && !isMe && (
                                                                <div className="wa-forwarded-tag">
                                                                    <Forward size={12} style={{ marginRight: 4 }} />
                                                                    {(msg.forward_count || 0) >= 4 ? 'Forwarded many times' : 'Forwarded'}
                                                                </div>
                                                            )}
                                                            {!isForwardingMode && (
                                                                <div className="wa-dropdown-trigger msg-trigger" onClick={(e) => handleMsgDropdownOpen(e, msg._id)}>
                                                                    <ChevronDown size={18} />
                                                                </div>
                                                            )}
                                                            {!isForwardingMode && renderDropdownMenu('msg', msg._id, msg)}

                                                            {/* Reply Context Rendering */}
                                                            {msg.reply_to && (
                                                                <div className="wa-reply-context">
                                                                    <div className="wa-reply-context-name">
                                                                        {isMeMsg(msg.reply_to) ? 'You' : (selectedUser.name || 'User')}
                                                                    </div>
                                                                    <div className="wa-reply-context-text">
                                                                        {msg.reply_to.type === 'image' ? '📷 Image' : (msg.reply_to.type === 'file' ? '📄 File' : (msg.reply_to.content || ''))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Image Rendering */}
                                                            {msg.type === 'image' && !msg.is_deleted_by_admin && !msg.is_deleted_by_user && (
                                                                <div className="wa-msg-image-container" onClick={(e) => {
                                                                    if (isForwardingMode) return;
                                                                    e.stopPropagation();
                                                                    setViewingImage(msg);
                                                                }}>
                                                                    <img src={msg.file_path} alt="Sent" className="wa-msg-image" />
                                                                </div>
                                                            )}
                                                            {/* File Rendering */}
                                                            {msg.type === 'file' && !msg.is_deleted_by_admin && !msg.is_deleted_by_user && (
                                                                <div
                                                                    className="wa-msg-doc-bubble"
                                                                    onClick={() => handleDownload(msg.file_path, msg.fileName)}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    {/* Top: Preview */}
                                                                    <div className="wa-doc-preview-area">
                                                                        {/* Simulated Page Content */}
                                                                        <div className="wa-doc-preview-simulated">
                                                                            {/* Simulate text lines */}
                                                                            <div style={{ width: '80%', height: 6, background: '#d1d7db', marginBottom: 6 }}></div>
                                                                            <div style={{ width: '100%', height: 4, background: '#e9edef', marginBottom: 3 }}></div>
                                                                            <div style={{ width: '100%', height: 4, background: '#e9edef', marginBottom: 3 }}></div>
                                                                            <div style={{ width: '90%', height: 4, background: '#e9edef', marginBottom: 3 }}></div>

                                                                            <div style={{ marginTop: 10, width: '40%', height: 20, background: '#e9edef' }}></div> {/* Image placeholder */}

                                                                            <div style={{ flex: 1 }}></div>
                                                                            <div style={{ fontSize: 8, color: '#999', textAlign: 'center' }}>Page 1</div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bottom: Info Footer */}
                                                                    <div className="wa-doc-info-area">
                                                                        <div className="wa-doc-icon" style={{ background: 'transparent', padding: 0 }}>
                                                                            <FileText size={30} color="#e53935" strokeWidth={1.5} />
                                                                        </div>
                                                                        <div className="wa-doc-details">
                                                                            <div className="wa-doc-filename" title={msg.fileName || 'Document'}>
                                                                                {msg.fileName || 'Document.pdf'}
                                                                            </div>
                                                                            <div className="wa-doc-meta">
                                                                                {msg.pageCount || 1} pages • {(msg.fileName || msg.file_path)?.split('.').pop()?.toUpperCase() || 'PDF'} • {msg.fileSize ? Math.ceil(msg.fileSize / 1024) + ' kB' : 'Unknown size'}
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Link Preview Card */}
                                                            {msg.link_preview && msg.link_preview.title && !msg.is_deleted_by_admin && !msg.is_deleted_by_user && (
                                                                <div
                                                                    className={`wa-link-preview-card ${!msg.link_preview.image ? 'no-image' : ''} ${((msg.link_preview.domain?.includes('youtube') || msg.link_preview.domain?.includes('youtu.be'))) ? 'youtube' : ''}`}
                                                                    onClick={() => window.open(msg.link_preview.url, '_blank')}
                                                                    style={{ cursor: 'pointer', transition: 'none' }}
                                                                >
                                                                    {msg.link_preview.image && (
                                                                        <div className="wa-link-preview-image">
                                                                            <img src={msg.link_preview.image} alt={msg.link_preview.title} />
                                                                            {(msg.link_preview.domain?.includes('youtube') || msg.link_preview.domain?.includes('youtu.be')) && (
                                                                                <div className="wa-link-preview-play-btn">
                                                                                    <div className="wa-play-icon">▶</div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="wa-link-preview-content">
                                                                        <div className="wa-link-preview-title">{msg.link_preview.title}</div>
                                                                        {msg.link_preview.description && <div className="wa-link-preview-description">{msg.link_preview.description}</div>}
                                                                        <div className="wa-link-preview-domain">
                                                                            {(msg.link_preview.domain?.includes('youtube') || msg.link_preview.domain?.includes('youtu.be')) ? (
                                                                                <>
                                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ff0000" />
                                                                                    </svg>
                                                                                    <span style={{ color: '#ff0000', fontWeight: 'bold' }}>{msg.link_preview.domain}</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                                    </svg>
                                                                                    <span>{msg.link_preview.domain}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {msg.is_deleted_by_admin ? (
                                                                <div className="wa-deleted-tag">
                                                                    <Trash2 size={16} /> This message was deleted by Admin
                                                                </div>
                                                            ) : msg.is_deleted_by_user ? (
                                                                <div className="wa-deleted-tag">
                                                                    <XCircle size={16} /> {isMe ? 'You deleted this message' : 'This message was deleted'}
                                                                </div>
                                                            ) : msg.content && (
                                                                <span>{renderContent(msg.content)}</span>
                                                            )}

                                                            <div className="wa-msg-meta">
                                                                {msg.is_starred && <Star size={12} fill="#8696a0" color="#8696a0" style={{ marginRight: 3 }} />}
                                                                <span>{formatTime(msg.created_at)}</span>
                                                                {isMe && (
                                                                    msg.is_read
                                                                        ? <CheckCheck size={14} color="#53bdeb" />
                                                                        : <CheckCheck size={14} color="#9ca3af" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                            <div ref={bottomRef} />
                        </div>

                        {/* Forward Bottom Bar */}
                        {isForwardingMode ? (
                            <div className="wa-forward-bottom-bar">
                                <div className="wa-forward-left-group">
                                    <button className="wa-forward-cancel-btn" onClick={() => {
                                        setIsForwardingMode(false);
                                        setIsChatSelectionMode(false);
                                        setForwardSelectedMsgs([]);
                                    }}>
                                        <X size={24} />
                                    </button>
                                    <span className="wa-forward-count">{forwardSelectedMsgs.length} selected</span>
                                </div>
                                <div className="wa-selection-actions">
                                    {isChatSelectionMode && (
                                        <>
                                            {/* Star */}
                                            <button onClick={handleChatSelectionBulkStar} title="Star messages" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Star size={24} color="#ffffff" />
                                            </button>
                                            {/* Delete */}
                                            <button onClick={handleChatSelectionBulkDelete} title="Delete messages" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Trash2 size={24} color="#ffffff" />
                                            </button>
                                        </>
                                    )}
                                    {/* Forward - Always show if we are in either mode since it's the "Forward" button */}
                                    <button
                                        onClick={() => setIsForwardModalOpen(true)}
                                        disabled={forwardSelectedMsgs.length === 0}
                                        title="Forward messages"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Forward size={24} color="#ffffff" />
                                    </button>
                                    {isChatSelectionMode && (
                                        <>
                                            {/* Copy */}
                                            <button onClick={handleChatSelectionBulkCopy} title="Copy messages" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Copy size={24} color="#ffffff" />
                                            </button>
                                            {/* Download - Only show if there's actual media to download */}
                                            {forwardSelectedMsgs.some(m => m.type === 'image' || m.type === 'video' || m.type === 'file' || m.type === 'audio') && (
                                                <button onClick={handleChatSelectionBulkDownload} title="Download media" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Download size={24} color="#ffffff" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Footer Input Area 
                            <div className="wa-footer-wrapper">
                                {renderGrammarBar()}

                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                                    {/* Typing Link Preview */}
                                    {typingLinkPreview && typingLinkPreview.title && (
                                        <div className="wa-typing-link-preview">
                                            <div className="wa-typing-preview-header" style={{ justifyContent: 'flex-end' }}>
                                                <X
                                                    size={16}
                                                    style={{ cursor: 'pointer', color: '#667781' }}
                                                    onClick={() => setTypingLinkPreview(null)}
                                                />
                                            </div>
                                            <div className="wa-typing-preview-card">
                                                {typingLinkPreview.image && (
                                                    <img
                                                        src={typingLinkPreview.image}
                                                        alt={typingLinkPreview.title}
                                                        className="wa-typing-preview-image"
                                                    />
                                                )}
                                                <div className="wa-typing-preview-text">
                                                    <div className="wa-typing-preview-title">{typingLinkPreview.title}</div>
                                                    {typingLinkPreview.description && (
                                                        <div className="wa-typing-preview-description">{typingLinkPreview.description}</div>
                                                    )}
                                                    <div className="wa-typing-preview-domain">
                                                        {typingLinkPreview.domain === 'youtube.com' || typingLinkPreview.domain === 'www.youtube.com' ? (
                                                            <>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000" />
                                                                </svg>
                                                                <span>{typingLinkPreview.domain}</span>
                                                            </>
                                                        ) : (
                                                            <span>{typingLinkPreview.domain}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {replyingTo && (
                                        <div className="wa-reply-preview-container">
                                            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                                                <div className="wa-reply-preview-header">
                                                    <span className="wa-reply-preview-name">
                                                        {isMeMsg(replyingTo) ? t('chat_window.you') : (selectedUser?.name || 'User')}
                                                    </span>
                                                </div>
                                                <div className="wa-reply-preview-content">
                                                    {replyingTo.type === 'image' ? '📷 Photo' : (replyingTo.type === 'file' ? '📄 File' : replyingTo.content)}
                                                </div>
                                            </div>
                                            {replyingTo.type === 'image' && replyingTo.file_path && (
                                                <div className="wa-reply-preview-thumb">
                                                    <img src={replyingTo.file_path} alt="thumbnail" />
                                                </div>
                                            )}
                                            <X
                                                size={16}
                                                className="wa-reply-preview-close"
                                                onClick={() => setReplyingTo(null)}
                                            />
                                        </div>
                                    )}

                                    <div className="wa-input-pill">
                                        <div className="wa-footer-left-icons">
                                            <button className="wa-nav-icon-btn" onClick={() => fileInputRef.current.click()} title="Allowed files: JPG, JPEG, PNG, DOC, DOCX, PDF, Excel, Video (up to 1GB)">
                                                <Paperclip size={22} color="#54656f" />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                style={{ display: 'none' }}
                                                accept=".jpg,.jpeg,.png,.doc,.docx,.pdf,.xls,.xlsx,.mp4,.avi,.mkv,.mov,.webm,video/*"
                                                onChange={handleFileSelect}
                                            />
                                            <button className="wa-nav-icon-btn">
                                                <Smile size={22} color="#54656f" />
                                            </button>
                                        </div>

                                        <div className="wa-input-area">
                                            {file && (
                                                <div className="wa-file-preview-badge">
                                                    {file.name.substring(0, 15)}...
                                                    <button onClick={() => setFile(null)}>×</button>
                                                </div>
                                            )}
                                            <textarea
                                                className="wa-input-box"
                                                placeholder={t('chat_window.input_placeholder')}
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onPaste={handlePaste}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSend(e);
                                                    }
                                                }}
                                                rows={1}
                                                style={{ resize: 'none', overflowY: 'auto' }}
                                            />
                                        </div>

                                        <div className="wa-footer-right-icons">
                                            {(input.trim() || file) ? (
                                                <button onClick={handleSend} className="wa-send-btn-circle-inner">
                                                    <Send size={24} color="white" strokeWidth={2.5} />
                                                </button>
                                            ) : (
                                                <button className="wa-nav-icon-btn-pill">
                                                    <Mic size={22} color="#54656f" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : selectedGroup ? (
                    <>
                        <div className="wa-chat-header" style={{ background: 'white' }}>
                            <div className="wa-chat-header-user">
                                {/* Mobile Back Button */}
                                <button
                                    className="wa-nav-icon-btn mobile-back-btn"
                                    onClick={() => setSelectedGroup(null)}
                                >
                                    <ArrowLeft size={24} />
                                </button>

                                <div className="wa-chat-header-user" onClick={() => { /* In future could open group info */ }}>
                                    <div className="wa-avatar" style={{ width: 40, height: 40, marginRight: 10, background: '#dfe5e7' }}>
                                        {selectedGroup.icon ? (
                                            <img src={selectedGroup.icon} alt="group" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <Camera size={22} color="#8696a0" />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 500, fontSize: 16, color: '#111b21' }}>
                                            {selectedGroup.name || 'Unnamed Group'}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#667781' }}>
                                            {selectedGroup.members?.map(m => m.name).join(', ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="wa-header-icons">
                                <button className="wa-call-dropdown-btn">
                                    <Video size={18} style={{ marginRight: 8 }} />
                                    <span>Call</span>
                                    <ChevronDown size={14} style={{ marginLeft: 6 }} />
                                </button>
                                <button
                                    className={`wa-nav-icon-btn ${isMessageSearchOpen ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsMessageSearchOpen(!isMessageSearchOpen);
                                        searchSource.current = 'group_header';
                                    }}
                                >
                                    <Search size={20} />
                                </button>
                                <button className="wa-nav-icon-btn"><MoreVertical size={20} /></button>
                            </div>
                        </div>

                        {/* Group Messages Area */}
                        <div
                            ref={chatMessagesRef}
                            className="wa-chat-messages-area"
                            onScroll={() => {
                                const el = chatMessagesRef.current;
                                if (!el) return;
                                const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                                setShowScrollBtn(distFromBottom > 80);
                            }}
                        >
                            <div style={{ flex: '1 1 auto' }}></div>

                            {/* Group Welcome Card */}
                            <div className="wa-group-welcome-card">
                                <div className="wa-group-welcome-avatar">
                                    {selectedGroup.icon ? (
                                        <img src={selectedGroup.icon} alt="group" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <Camera size={44} color="#8696a0" />
                                    )}
                                    <div className="wa-welcome-camera-badge"><Camera size={14} color="white" /></div>
                                </div>
                                <div className="wa-group-welcome-title">
                                    {String(selectedGroup.admin?._id || selectedGroup.admin) === String(user.id || user._id) ? 'You created this group' : `${selectedGroup.admin?.name || 'Admin'} created this group`}
                                </div>
                                <div className="wa-group-welcome-subtitle">
                                    {selectedGroup.members?.length} members • {selectedGroup.members?.length} contacts • Created {formatDateForSeparator(selectedGroup.created_at)}
                                </div>
                                <div className="wa-group-welcome-action">Add description...</div>
                                <div className="wa-group-welcome-buttons">
                                    <button className="wa-welcome-btn"><Pencil size={14} style={{ marginRight: 8 }} /> Name this group</button>
                                    <button className="wa-welcome-btn"><UserPlus size={14} style={{ marginRight: 8 }} /> Add members</button>
                                </div>
                            </div>

                            <div className="wa-group-welcome-info" style={{ margin: '10px auto 20px', maxWidth: '85%' }}>
                                <Lock size={12} style={{ marginRight: 6 }} />
                                Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Click to learn more
                            </div>

                            {/* Render Group Messages with Date Grouping */}
                            {(() => {
                                const groupedGroupMessages = [];
                                let currentGroup = null;

                                groupMessages
                                    .filter(msg => {
                                        if (!messageSearchQuery) return true;
                                        return (msg.content || '').toLowerCase().includes(messageSearchQuery.toLowerCase());
                                    })
                                    .forEach((msg) => {
                                        const dateLabel = formatDateForSeparator(msg.created_at);
                                        if (!currentGroup || currentGroup.date !== dateLabel) {
                                            currentGroup = {
                                                date: dateLabel,
                                                msgs: []
                                            };
                                            groupedGroupMessages.push(currentGroup);
                                        }
                                        currentGroup.msgs.push(msg);
                                    });

                                return groupedGroupMessages.map((dateGroup, gIdx) => (
                                    <div key={gIdx} className="wa-date-group">
                                        {dateGroup.date && (
                                            <div className="wa-date-separator">
                                                <span>{dateGroup.date}</span>
                                            </div>
                                        )}
                                        <div className="wa-group-messages">
                                            {dateGroup.msgs.map((msg, mIdx) => {
                                                const myId = user.id || user._id;
                                                const isMe = isMeMsg(msg);
                                                const senderName = msg.sender_id?.name || 'User';

                                                if (msg.is_system || msg.type === 'system') {
                                                    return (
                                                        <div key={msg._id} style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                                            <div className="wa-system-message">
                                                                {isMe ? 'You' : senderName} {msg.content}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={msg._id}
                                                        id={`msg-${msg._id}`}
                                                        className={`wa-message-container ${isForwardingMode ? 'forward-mode' : ''}`}
                                                        onClick={() => {
                                                            if (isForwardingMode) {
                                                                const isSelected = forwardSelectedMsgs.find(m => (m._id || m.id) === (msg._id || msg.id));
                                                                if (isSelected) {
                                                                    setForwardSelectedMsgs(prev => prev.filter(m => (m._id || m.id) !== (msg._id || msg.id)));
                                                                } else {
                                                                    setForwardSelectedMsgs(prev => [...prev, msg]);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {isForwardingMode && (
                                                            <div className="wa-msg-checkbox">
                                                                {forwardSelectedMsgs.find(m => m._id === msg._id) ?
                                                                    <CheckSquare size={24} color="white" fill="#027EB5" /> :
                                                                    <div className="wa-checkbox-empty" />
                                                                }
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`wa-message-bubble ${isMe ? 'wa-msg-sent' : 'wa-msg-rec'}`}
                                                            onContextMenu={(e) => { if (!isForwardingMode) { e.preventDefault(); handleMsgDropdownOpen(e, msg._id); } }}
                                                        >
                                                            {!isForwardingMode && (
                                                                <div className="wa-dropdown-trigger msg-trigger" onClick={(e) => handleMsgDropdownOpen(e, msg._id)}>
                                                                    <ChevronDown size={18} />
                                                                </div>
                                                            )}
                                                            {!isForwardingMode && renderDropdownMenu('msg', msg._id, msg)}

                                                            {msg.reply_to && (
                                                                <div className="wa-reply-context">
                                                                    <div className="wa-reply-context-name">
                                                                        {isMeMsg(msg.reply_to) ? 'You' : (msg.reply_to.sender_id?.name || 'User')}
                                                                    </div>
                                                                    <div className="wa-reply-context-text">
                                                                        {msg.reply_to.type === 'image' ? '📷 Photo' : (msg.reply_to.type === 'file' ? '📄 File' : msg.reply_to.content)}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!isMe && <div style={{ fontSize: 12, fontWeight: 700, color: '#00a884', marginBottom: 4 }}>{senderName}</div>}

                                                            {msg.is_deleted_by_admin ? (
                                                                <div className="wa-deleted-tag">
                                                                    <Trash2 size={16} /> This message was deleted by Admin
                                                                </div>
                                                            ) : msg.is_deleted_by_user ? (
                                                                <div className="wa-deleted-tag">
                                                                    <XCircle size={16} /> {isMe ? 'You deleted this message' : 'This message was deleted'}
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {msg.type === 'image' && msg.file_path && (
                                                                        <div className="wa-msg-image-wrapper" onClick={() => setViewingImage(msg)}>
                                                                            <img src={msg.file_path} alt="msg" className="wa-msg-image" />
                                                                        </div>
                                                                    )}

                                                                    {msg.type === 'video' && msg.file_path && (
                                                                        <div className="wa-msg-video-wrapper" onClick={() => setViewingImage(msg)}>
                                                                            <video src={msg.file_path} className="wa-msg-video" />
                                                                            <div className="wa-video-play-overlay"><Play size={40} color="white" fill="rgba(255,255,255,0.3)" /></div>
                                                                        </div>
                                                                    )}

                                                                    {msg.type === 'file' && msg.file_path && (
                                                                        <div className="wa-msg-file" onClick={() => handleDownload(msg.file_path, msg.fileName)}>
                                                                            <FileText size={32} color="#8696a0" />
                                                                            <div className="wa-msg-file-info">
                                                                                <div className="wa-msg-file-name">{msg.fileName || 'document.pdf'}</div>
                                                                                <div className="wa-msg-file-meta">{msg.fileSize || 'Unknown size'} • {msg.fileName?.split('.').pop().toUpperCase()}</div>
                                                                            </div>
                                                                            <Download size={20} color="#8696a0" className="wa-file-download-icon" />
                                                                        </div>
                                                                    )}

                                                                    {msg.link_preview && (
                                                                        <div
                                                                            className={`wa-link-preview-card ${getYouTubeVideoId(msg.link_preview.url) ? 'youtube' : ''}`}
                                                                            onClick={() => window.open(msg.link_preview.url, '_blank')}
                                                                        >
                                                                            {msg.link_preview.image && (
                                                                                <div className="wa-link-preview-image">
                                                                                    <img src={msg.link_preview.image} alt="preview" />
                                                                                    {getYouTubeVideoId(msg.link_preview.url) && (
                                                                                        <div
                                                                                            className="wa-yt-preview-overlay"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setPreviewVideoUrl(msg.link_preview.url);
                                                                                            }}
                                                                                        >
                                                                                            <div className="wa-yt-play-btn">
                                                                                                <Play size={32} color="white" fill="white" />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <div className="wa-link-preview-info">
                                                                                <div className="wa-link-preview-title">{msg.link_preview.title}</div>
                                                                                <div className="wa-link-preview-desc">{msg.link_preview.description}</div>
                                                                                <div className="wa-link-preview-url">
                                                                                    {(() => {
                                                                                        try {
                                                                                            return new URL(msg.link_preview.url).hostname;
                                                                                        } catch (e) {
                                                                                            return msg.link_preview.url;
                                                                                        }
                                                                                    })()}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {msg.content && <span>{renderContent(msg.content)}</span>}
                                                                </>
                                                            )}

                                                            <div className="wa-msg-meta">
                                                                <span className="wa-timestamp">
                                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                </span>
                                                                {isMe && (
                                                                    <div className="wa-msg-status">
                                                                        <CheckCheck size={14} color="#53bdeb" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}

                            <div ref={bottomRef} />
                        </div>

                        {/* Group Input */}
                        <div className="wa-footer-wrapper">
                            {renderGrammarBar()}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                                {/* Typing Link Preview */}
                                {typingLinkPreview && typingLinkPreview.title && (
                                    <div className="wa-typing-link-preview">
                                        <div className="wa-typing-preview-header" style={{ justifyContent: 'flex-end' }}>
                                            <X size={16} style={{ cursor: 'pointer', color: '#667781' }} onClick={() => setTypingLinkPreview(null)} />
                                        </div>
                                        <div className="wa-typing-preview-card">
                                            {typingLinkPreview.image && <img src={typingLinkPreview.image} alt={typingLinkPreview.title} className="wa-typing-preview-image" />}
                                            <div className="wa-typing-preview-text">
                                                <div className="wa-typing-preview-title">{typingLinkPreview.title}</div>
                                                {typingLinkPreview.description && <div className="wa-typing-preview-description">{typingLinkPreview.description}</div>}
                                                <div className="wa-typing-preview-domain"><span>{typingLinkPreview.domain}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {replyingTo && (
                                    <div className="wa-reply-preview-container">
                                        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                                            <div className="wa-reply-preview-header">
                                                <span className="wa-reply-preview-name">
                                                    {isMeMsg(replyingTo) ? 'You' : (replyingTo.sender_id?.name || 'User')}
                                                </span>
                                            </div>
                                            <div className="wa-reply-preview-content">
                                                {replyingTo.type === 'image' ? '📷 Photo' : (replyingTo.type === 'file' ? '📄 File' : replyingTo.content)}
                                            </div>
                                        </div>
                                        {replyingTo.type === 'image' && replyingTo.file_path && (
                                            <div className="wa-reply-preview-thumb">
                                                <img src={replyingTo.file_path} alt="thumbnail" />
                                            </div>
                                        )}
                                        <X size={16} className="wa-reply-preview-close" onClick={() => setReplyingTo(null)} />
                                    </div>
                                )}

                                <div className="wa-footer-inner">
                                    <div className="wa-input-pill">
                                        <div className="wa-footer-left-icons">
                                            <button className="wa-nav-icon-btn" onClick={() => fileInputRef.current.click()} title="Allowed files: JPG, JPEG, PNG, DOC, DOCX, PDF, Excel, Video (up to 1GB)">
                                                <Plus size={22} color="#54656f" />
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                style={{ display: 'none' }}
                                                accept=".jpg,.jpeg,.png,.doc,.docx,.pdf,.xls,.xlsx,.mp4,.avi,.mkv,.mov,.webm,video/*"
                                                onChange={handleFileSelect}
                                            />
                                            <button className="wa-nav-icon-btn">
                                                <Smile size={22} color="#54656f" />
                                            </button>
                                        </div>

                                        <div className="wa-input-area">
                                            <textarea
                                                className="wa-input-box"
                                                placeholder="Type a message"
                                                value={groupInput}
                                                onChange={(e) => setGroupInput(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (!groupInput.trim()) return;
                                                        const text = groupInput;
                                                        setGroupInput('');
                                                        const replyId = replyingTo?._id || replyingTo?.id;
                                                        setReplyingTo(null);
                                                        try {
                                                            const token = localStorage.getItem('token');
                                                            const res = await axios.post(`/api/groups/${selectedGroup._id}/send`, { content: text, reply_to: replyId }, {
                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                            });
                                                            setGroupMessages(prev => {
                                                                if (prev.find(m => m._id === res.data.message?._id)) return prev;
                                                                return [...prev, res.data.message];
                                                            });
                                                            setTimeout(scrollToBottom, 50);
                                                        } catch (err) { console.error('Group send failed', err); }
                                                    }
                                                }}
                                                rows={1}
                                                style={{ resize: 'none', overflowY: 'auto' }}
                                            />
                                        </div>

                                        <div className="wa-footer-right-icons">
                                            {groupInput.trim() ? (
                                                <button className="wa-send-btn-circle-inner" onClick={async () => {
                                                    if (!groupInput.trim()) return;
                                                    const text = groupInput;
                                                    setGroupInput('');
                                                    const replyId = replyingTo?._id || replyingTo?.id;
                                                    setReplyingTo(null);
                                                    try {
                                                        const token = localStorage.getItem('token');
                                                        const res = await axios.post(`/api/groups/${selectedGroup._id}/send`, { content: text, reply_to: replyId }, {
                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                        });
                                                        setGroupMessages(prev => {
                                                            if (prev.find(m => m._id === res.data.message?._id)) return prev;
                                                            return [...prev, res.data.message];
                                                        });
                                                        setTimeout(scrollToBottom, 50);
                                                    } catch (err) { console.error('Group send failed', err); }
                                                }}>
                                                    <Send size={24} color="white" strokeWidth={2.5} />
                                                </button>
                                            ) : (
                                                <button className="wa-nav-icon-btn-pill">
                                                    <Mic size={22} color="#54656f" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: '#41525d' }}>
                        <h2>Neural Chat</h2>
                        <p style={{ fontSize: 14, marginTop: 10 }}>Send and receive messages without keeping your phone online.</p>
                    </div>
                )}

                {/* Shared Scroll-to-bottom Button positioned in wa-main-chat parent */}
                {showScrollBtn && (selectedUser || selectedGroup) && (window.innerWidth > 768 || !(isMessageSearchOpen || isContactInfoOpen || isStarredMessagesOpen || isSharedMediaOpen || isEditContactOpen || isNotificationSettingsOpen)) && (
                    <button
                        className="wa-scroll-to-bottom-btn"
                        onClick={() => {
                            chatMessagesRef.current?.scrollTo({ top: chatMessagesRef.current.scrollHeight, behavior: 'smooth' });
                        }}
                        title="Scroll to latest"
                    >
                        <ChevronDown size={22} />
                    </button>
                )}
            </div>
            {isMessageSearchOpen && (selectedUser || selectedGroup) && renderSearchSidebar()}
            {renderContactInfoPanel()}
            {renderSharedMediaPanel()}
            {renderStarredMessagesPanel()}
            {renderEditContactPanel()}
            {renderNotificationSettingsPanel()}
        </div >
    );

    const renderSettingsPanel = () => {
        if (!isSettingsOpen) return null;

        const settingsTabs = [
            { id: 'profile', label: t('settings.tabs.profile.label'), icon: User, description: t('settings.tabs.profile.description') },
            { id: 'general', label: t('settings.tabs.general.label'), icon: Settings2, description: t('settings.tabs.general.description') },
            { id: 'security', label: t('settings.tabs.security.label'), icon: ShieldCheck, description: t('settings.tabs.security.description') },
            { id: 'privacy', label: t('settings.tabs.privacy.label'), icon: Lock, description: t('settings.tabs.privacy.description') },
            { id: 'chats', label: t('settings.tabs.chats.label'), icon: MessageSquare, description: t('settings.tabs.chats.description') },
            { id: 'media', label: t('settings.tabs.media.label'), icon: Video, description: t('settings.tabs.media.description') },
            { id: 'notifications', label: t('settings.tabs.notifications.label'), icon: BellRing, description: t('settings.tabs.notifications.description') },
            { id: 'devices', label: t('settings.tabs.devices.label'), icon: Laptop, description: t('settings.tabs.devices.description') },
            { id: 'shortcuts', label: t('settings.tabs.shortcuts.label'), icon: Keyboard, description: t('settings.tabs.shortcuts.description') },
            { id: 'support', label: t('settings.tabs.support.label'), icon: HelpCircle, description: t('settings.tabs.support.description') },
        ];

        const renderTabContent = () => {
            switch (activeSettingsTab) {
                case 'profile':
                    return (
                        <div className="wa-settings-tab-content fade-in">
                            <div className="wa-settings-profile-card">
                                <div className="wa-settings-glow" />
                                <div className="wa-settings-profile-main">
                                    <div className="wa-settings-avatar-wrap">
                                        <div className="wa-settings-avatar">
                                            <img src={userData.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256"} alt="Profile" />
                                        </div>
                                        <button className="wa-settings-avatar-edit"><Camera size={18} /></button>
                                    </div>
                                    <div className="wa-settings-profile-info">
                                        <div className="wa-settings-name-row">
                                            <h3>{userData.name || "User"}</h3>
                                            <span className="wa-settings-status-badge">
                                                <div className="wa-settings-status-dot pulse" /> {t('settings.profile.status_available')}
                                            </span>
                                        </div>
                                        <p className="wa-settings-title">{userData.designation || "Lead Systems Architect"} — <span>Enterprise Core</span></p>
                                        <div className="wa-settings-meta-row">
                                            <div className="wa-settings-meta-item"><Building2 size={14} /> HQ - San Francisco</div>
                                            <div className="wa-settings-meta-item"><Clock size={14} /> (GMT-7) Pacific Time</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="wa-settings-grid">
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">{t('settings.profile.professional_id')}</h4>
                                    <div className="wa-settings-fields">
                                        <div className="wa-settings-field read-only">
                                            <label>{t('settings.profile.corp_email')}</label>
                                            <p>{userData.email || "johnklauss@gmail.com"}</p>
                                        </div>
                                        <div className="wa-settings-field read-only">
                                            <label>{t('settings.profile.emp_id')}</label>
                                            <p className="font-mono">{userData.loginId || "EMP-992-ARC"}</p>
                                        </div>
                                        <div className="wa-settings-field read-only">
                                            <label>{t('settings.profile.job_pos')}</label>
                                            <p>{userData.designation || "Lead Systems Architect"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">{t('settings.profile.personal_bio')}</h4>
                                    <div className="wa-settings-fields">
                                        <div className="wa-settings-field read-only">
                                            <label>{t('settings.profile.display_name')}</label>
                                            <p>{userData.name || "User"}</p>
                                        </div>
                                        <div className="wa-settings-field">
                                            <label>{t('settings.profile.about')}</label>
                                            {isSettingsEditing ? (
                                                <textarea
                                                    className="wa-settings-input wa-settings-textarea"
                                                    value={userData.about || ""}
                                                    placeholder={t('settings.profile.about_placeholder')}
                                                    onChange={(e) => setUserData({ ...userData, about: e.target.value })}
                                                />
                                            ) : (
                                                <p>{userData.about || t('settings.profile.status_available')}</p>
                                            )}
                                        </div>
                                        <div className="wa-settings-field">
                                            <label>{t('settings.profile.phone')}</label>
                                            {isSettingsEditing ? (
                                                <input
                                                    type="text"
                                                    className="wa-settings-input"
                                                    value={userData.mobile || ""}
                                                    onChange={(e) => setUserData({ ...userData, mobile: e.target.value })}
                                                />
                                            ) : (
                                                <p>{userData.mobile || "N/A"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                case 'general': {
                    const languages = [
                        'Albanian, Shqip', 'Arabic, العربية', 'Azerbaijani, Azərbaycan',
                        'Bangla, বাংলা', 'Brazilian Portuguese, Português (Brasil)',
                        'British English, British English', 'Bulgarian, Български', 'Catalan, Català',
                        'Chinese Simplified, 中文(简体)', 'Chinese Traditional, 中文(繁體)',
                        'Croatian, Hrvatski', 'Czech, Čeština', 'Danish, Dansk',
                        'Dutch, Nederlands', 'English, English', 'Estonian, Eesti',
                        'Finnish, Suomi', 'French, Français', 'German, Deutsch',
                        'Greek, Ελληνικά', 'Hebrew, עברית', 'Hindi, हिन्दी',
                        'Hungarian, Magyar', 'Indonesian, Bahasa Indonesia', 'Italian, Italiano',
                        'Japanese, 日本語', 'Kannada, ಕನ್ನಡ', 'Korean, 한국어',
                        'Latvian, Latviešu', 'Lithuanian, Lietuvių', 'Malay, Bahasa Melayu',
                        'Marathi, मराठी', 'Norwegian, Norsk', 'Polish, Polski',
                        'Romanian, Română', 'Russian, Русский', 'Slovak, Slovenčina',
                        'Slovenian, Slovenščina', 'Spanish, Español', 'Swedish, Svenska',
                        'Tamil, தமிழ்', 'Telugu, తెలుగు', 'Thai, ไทย',
                        'Turkish, Türkçe', 'Ukrainian, Українська', 'Urdu, اردو',
                        'Vietnamese, Tiếng Việt'
                    ];

                    return (
                        <div className="wa-settings-tab-content fade-in">
                            {/* Language Section */}
                            <div className="wa-general-section">
                                <p className="wa-general-section-label">{t('general.language')}</p>
                                <div
                                    className={`wa-general-dropdown-trigger ${isLanguageDropdownOpen ? 'open' : ''}`}
                                    onClick={() => { setIsLanguageDropdownOpen(v => !v); setIsFontSizeDropdownOpen(false); }}
                                >
                                    <Globe size={18} className="wa-general-dropdown-globe" />
                                    <span className="wa-general-dropdown-value">{selectedLanguage.split(',')[0].trim()}</span>
                                    <ChevronDown size={18} className={`wa-general-dropdown-chevron ${isLanguageDropdownOpen ? 'flipped' : ''}`} />
                                </div>
                                {isLanguageDropdownOpen && (
                                    <div className="wa-general-dropdown-list custom-scrollbar">
                                        {languages.map(lang => (
                                            <div
                                                key={lang}
                                                className={`wa-general-dropdown-option ${selectedLanguage === lang ? 'selected' : ''}`}
                                                onClick={() => {
                                                    if (lang !== selectedLanguage) {
                                                        setPendingLanguage(lang);
                                                        setIsLangConfirmOpen(true);
                                                    }
                                                    setIsLanguageDropdownOpen(false);
                                                }}
                                            >
                                                <span>{lang}</span>
                                                {selectedLanguage === lang && <Check size={16} className="wa-general-selected-check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Font Size Section */}
                            <div className="wa-general-section" style={{ marginTop: 28 }}>
                                <p className="wa-general-section-label">{t('general.font_size')}</p>
                                <div
                                    className={`wa-general-dropdown-trigger ${isFontSizeDropdownOpen ? 'open' : ''}`}
                                    onClick={() => { setIsFontSizeDropdownOpen(v => !v); setIsLanguageDropdownOpen(false); }}
                                >
                                    <span className="wa-general-dropdown-value">{selectedFontSize}</span>
                                    <ChevronDown size={18} className={`wa-general-dropdown-chevron ${isFontSizeDropdownOpen ? 'flipped' : ''}`} />
                                </div>
                                {isFontSizeDropdownOpen && (
                                    <div className="wa-general-dropdown-list custom-scrollbar" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                        {fontSizesArr.map(size => (
                                            <div
                                                key={size}
                                                className={`wa-general-dropdown-option ${selectedFontSize === size ? 'selected' : ''}`}
                                                onClick={() => {
                                                    handleFontSizeChange(size);
                                                    setIsFontSizeDropdownOpen(false);
                                                }}
                                            >
                                                <span>{size}</span>
                                                {selectedFontSize === size && <Check size={16} className="wa-general-selected-check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="wa-general-font-hint">
                                    Use <kbd className="wa-general-kbd">Ctrl</kbd> + <kbd className="wa-general-kbd">/</kbd> - {t('general.font_size_hint')}
                                </p>
                            </div>
                        </div>
                    );
                }

                case 'privacy': {
                    const toggleSetting = (key) => {
                        setPrivacySettings(prev => ({ ...prev, [key]: !prev[key] }));
                    };

                    return (
                        <div className="wa-settings-tab-content fade-in">
                            <div className="wa-settings-grid privacy-grid">
                                {/* 🔐 1. Personal Info Visibility */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">Personal Info Visibility</h4>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Last Seen Visibility</p>
                                            <p className="wa-settings-item-desc">{privacySettings.lastSeen}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Online Status Visibility</p>
                                            <p className="wa-settings-item-desc">{privacySettings.onlineStatus}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Profile Photo Visibility</p>
                                            <p className="wa-settings-item-desc">{privacySettings.profilePhoto}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">About Visibility</p>
                                            <p className="wa-settings-item-desc">{privacySettings.about}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Status Visibility</p>
                                            <p className="wa-settings-item-desc">{privacySettings.status}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Read Receipts</p>
                                            <p className="wa-settings-item-desc">Control who can see when you read messages</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.readReceipts} onChange={() => toggleSetting('readReceipts')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Typing Indicator</p>
                                            <p className="wa-settings-item-desc">Show when you are typing a message</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.typingIndicator} onChange={() => toggleSetting('typingIndicator')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                </div>

                                {/* 🔒 2. Messaging & Forwarding Control */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">Messaging & Forwarding Control</h4>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Who Can Message Me</p>
                                            <p className="wa-settings-item-desc">{privacySettings.whoCanMessageMe}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Message Requests Required</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.messageRequestsRequired} onChange={() => toggleSetting('messageRequestsRequired')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Block Unknown Account Messages</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.blockUnknown} onChange={() => toggleSetting('blockUnknown')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Who Can Add Me to Groups</p>
                                            <p className="wa-settings-item-desc">{privacySettings.whoCanAddMeToGroups}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Require Consent Before Forwarding</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.requireConsentBeforeForward} onChange={() => toggleSetting('requireConsentBeforeForward')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Limit Message Forward Count</p>
                                            <p className="wa-settings-item-desc">{privacySettings.forwardLimit} messages</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Notify Me when Forwarded</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.notifyOnForward} onChange={() => toggleSetting('notifyOnForward')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                </div>

                                {/* 🧠 3. AI Privacy Protection */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">AI Privacy Protection</h4>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Enable Sensitive Data Scan</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.sensitiveDataScan} onChange={() => toggleSetting('sensitiveDataScan')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Auto-Redact Sensitive Information</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.autoRedact} onChange={() => toggleSetting('autoRedact')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Enable Scam & Threat Detection</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.scamDetection} onChange={() => toggleSetting('scamDetection')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Phishing Link Detection</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.phishingDetection} onChange={() => toggleSetting('phishingDetection')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Threat Alert Sensitivity</p>
                                            <p className="wa-settings-item-desc">{privacySettings.threatAlertSensitivity}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                {/* 📸 4. Screenshot & Media Protection */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">Screenshot & Media Protection</h4>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Screenshot Detection</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.screenshotDetection} onChange={() => toggleSetting('screenshotDetection')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Notify Me on Screenshot</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.notifyOnScreenshot} onChange={() => toggleSetting('notifyOnScreenshot')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Blur Messages After Screenshot</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.blurOnScreenshot} onChange={() => toggleSetting('blurOnScreenshot')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Add Watermark to Shared Media</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.addWatermark} onChange={() => toggleSetting('addWatermark')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                </div>

                                {/* 📍 5. Device & Access Privacy */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">Device & Access Privacy</h4>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Restrict to Approved Devices Only</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.restrictApprovedDevices} onChange={() => toggleSetting('restrictApprovedDevices')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Require Approval for New Device</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.requireApprovalNewDevice} onChange={() => toggleSetting('requireApprovalNewDevice')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Auto-Lock on Suspicious Location</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.autoLockLocationChange} onChange={() => toggleSetting('autoLockLocationChange')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Enable Geo-Fenced Messages</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.geoFencedMessages} onChange={() => toggleSetting('geoFencedMessages')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Restrict Messages to Country</p>
                                            <p className="wa-settings-item-desc">{privacySettings.restrictedCountry}</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                {/* 🎭 6. Hidden & Decoy Mode */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">Hidden & Decoy Mode</h4>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Enable Hidden Chats Folder</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.hiddenChatsFolder} onChange={() => toggleSetting('hiddenChatsFolder')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Enable Decoy Mode</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.decoyMode} onChange={() => toggleSetting('decoyMode')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Set / Change Decoy PIN</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Panic Mode</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.panicMode} onChange={() => toggleSetting('panicMode')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                </div>

                                {/* 📊 7. Privacy Score & Monitoring */}
                                <div className="wa-settings-section">
                                    <h4 className="wa-settings-section-title">Privacy Score & Monitoring</h4>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Show Privacy Score</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.showPrivacyScore} onChange={() => toggleSetting('showPrivacyScore')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Show Encryption Level Badge</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.showEncryptionBadge} onChange={() => toggleSetting('showEncryptionBadge')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Show Risk Alerts</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" checked={privacySettings.showRiskAlerts} onChange={() => toggleSetting('showRiskAlerts')} />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                case 'chats':
                    return (
                        <div className="wa-settings-tab-content fade-in">
                            <h3 className="wa-settings-content-title">Workspace Appearance</h3>
                            <div className="wa-settings-theme-grid">
                                {['Dark', 'Light', 'System Default'].map(theme => (
                                    <div
                                        key={theme}
                                        className={`wa-settings-theme-card ${selectedTheme === theme ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedTheme(theme);
                                            localStorage.setItem('neuChat_theme', theme);
                                        }}
                                    >
                                        <div className={`wa-settings-theme-preview ${theme.toLowerCase().replace(' ', '-')}`} />
                                        <p>{theme}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="wa-settings-section mt-8">
                                <h4 className="wa-settings-section-title">Chat History & Storage</h4>
                                <div className="wa-settings-list">
                                    <div className="wa-settings-item">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Auto-Archive Conversations</p>
                                            <p className="wa-settings-item-desc">Archive inactive chats after 30 days.</p>
                                        </div>
                                        <label className="wa-settings-toggle">
                                            <input type="checkbox" />
                                            <span className="wa-settings-toggle-slider" />
                                        </label>
                                    </div>
                                    <button className="wa-settings-list-action">
                                        <div className="wa-settings-item-info">
                                            <p className="wa-settings-item-label">Clear All Chat Data</p>
                                        </div>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );


                case 'media':
                    return (
                        <div className="wa-settings-tab-content fade-in">
                            <h3 className="wa-settings-content-title">Hardware Diagnostics</h3>
                            <div className="wa-settings-media-tester">
                                <div className="wa-settings-video-preview">
                                    <Video size={48} />
                                    <div className="wa-settings-video-status">
                                        <div className="wa-settings-status-dot error" /> Camera Inactive
                                    </div>
                                </div>
                                <div className="wa-settings-media-controls">
                                    <div className="wa-settings-grid">
                                        <div className="wa-settings-field-group">
                                            <label>Camera Source</label>
                                            <select className="wa-settings-select">
                                                <option>Integrated FaceTime HD Camera</option>
                                                <option>Logitech StreamCam Plus</option>
                                            </select>
                                        </div>
                                        <div className="wa-settings-field-group">
                                            <label>Microphone</label>
                                            <select className="wa-settings-select">
                                                <option>MacBook Pro Microphone</option>
                                                <option>Blue Yeti USB Mic</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="wa-settings-audio-meter">
                                        <Mic size={20} />
                                        <div className="wa-settings-meter-bar">
                                            <div className="wa-settings-meter-fill" style={{ width: '33%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );

                case 'shortcuts':
                    return (
                        <div className="wa-settings-tab-content fade-in">
                            <h3 className="wa-settings-content-title">Command Quick-Links</h3>
                            <div className="wa-settings-shortcuts-list">
                                {[
                                    { label: 'Search Messages', keys: ['Ctrl', 'F'] },
                                    { label: 'New Chat Session', keys: ['Ctrl', 'N'] },
                                    { label: 'Mute/Unmute Audio', keys: ['Ctrl', 'Shift', 'M'] },
                                    { label: 'Toggle Sidebar', keys: ['Ctrl', '\\'] },
                                    { label: 'Mark as Read', keys: ['Alt', 'R'] }
                                ].map((item, i) => (
                                    <div key={i} className="wa-settings-shortcut-item">
                                        <span>{item.label}</span>
                                        <div className="wa-settings-keys">
                                            {item.keys.map(key => (
                                                <kbd key={key}>{key}</kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );

                case 'support':
                    return (
                        <div className="wa-settings-tab-content fade-in">
                            <div className="wa-settings-support-banner">
                                <h3>Need Internal Support?</h3>
                                <p>Our dedicated IT workspace team is available 24/7 for security audits and hardware provisioning.</p>
                                <div className="wa-settings-banner-actions">
                                    <button className="wa-settings-btn-white">Contact Admin</button>
                                    <button className="wa-settings-btn-glass">Knowledge Base</button>
                                </div>
                            </div>
                            <div className="wa-settings-grid mt-6">
                                <div className="wa-settings-card">
                                    <h4>Compliance & Privacy</h4>
                                    <p>View your data processing agreement and local privacy compliance requirements for your region.</p>
                                    <button className="wa-settings-link">Read Legal Documentation &rarr;</button>
                                </div>
                                <div className="wa-settings-card">
                                    <h4>Version Info</h4>
                                    <p>Production Build: v2024.11.02-Stable</p>
                                    <p>Internal IP: 10.0.4.221</p>
                                    <button className="wa-settings-badge-success">Up to Date</button>
                                </div>
                            </div>
                        </div>
                    );

                default:
                    return (
                        <div className="wa-settings-empty-state-centered">
                            <div className="wa-settings-empty-logo">
                                <img src={logo} alt="Neural Chat" />
                                <h1 style={{ color: '#027EB5', fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>Neural Chat</h1>
                            </div>
                            <div className="wa-settings-empty-info">
                                <Settings size={32} color="#027EB5" />
                                <h3>{t('settings.choose_category')}</h3>
                                <p>{t('settings.choose_category_desc')}</p>
                            </div>
                        </div>
                    );
            }
        };

        return (
            <div className="wa-settings-overlay modal-animate-in">
                <div className="wa-settings-container">
                    {/* Navigation Sidebar */}
                    <div className={`wa-settings-sidebar ${activeSettingsTab ? 'hide-mobile' : ''}`}>
                        <div className="wa-settings-sidebar-header">
                            <h2 className="wa-settings-sidebar-title">{t('settings.title')}</h2>
                            <div className="wa-settings-search">
                                <Search size={16} />
                                <input placeholder={t('settings.search_placeholder')} />
                            </div>
                        </div>

                        <nav className="wa-settings-nav custom-scrollbar">
                            {settingsTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSettingsTab(tab.id)}
                                    className={`wa-settings-nav-item ${activeSettingsTab === tab.id ? 'active' : ''}`}
                                >
                                    <div className="wa-settings-nav-icon">
                                        <tab.icon size={20} />
                                    </div>
                                    <div className="wa-settings-nav-text">
                                        <p className="wa-settings-nav-label">{tab.label}</p>
                                        <p className="wa-settings-nav-desc">{tab.description}</p>
                                    </div>
                                    {activeSettingsTab === tab.id && <div className="wa-settings-active-indicator" />}
                                </button>
                            ))}
                        </nav>

                        <div className="wa-settings-sidebar-footer">
                            <button className="wa-settings-terminate-btn" onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                navigate('/login');
                            }}>
                                <LogOut size={16} />
                                {t('settings.terminate_session')}
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className={`wa-settings-main ${activeSettingsTab ? 'show-detail' : ''}`}>
                        {activeSettingsTab && (
                            <div className="wa-settings-header fade-in">
                                <button className="wa-settings-back-btn" onClick={() => setActiveSettingsTab(null)}>
                                    <ArrowLeft size={16} strokeWidth={2.5} />
                                </button>
                                <div className="wa-settings-header-info">
                                    <div className="wa-settings-breadcrumb">
                                        <span className="wa-settings-preferences-tag">{t('settings.preferences')}</span>
                                    </div>
                                    <h2 className="wa-settings-tab-title">
                                        {settingsTabs.find(tab => tab.id === activeSettingsTab)?.label || activeSettingsTab}
                                    </h2>
                                </div>
                                <div className="wa-settings-header-actions">
                                    {!isSettingsEditing ? (
                                        <button className="wa-settings-btn-edit" onClick={() => setIsSettingsEditing(true)}>
                                            <Pencil size={14} />
                                            <span className="wa-settings-btn-text-desktop">{t('settings.edit_identity')}</span>
                                            <span className="wa-settings-btn-text-mobile">Edit</span>
                                        </button>
                                    ) : (
                                        <>
                                            <button className="wa-settings-btn-cancel" onClick={() => setIsSettingsEditing(false)}>{t('settings.discard_changes')}</button>
                                            <button className="wa-settings-btn-commit" onClick={handleUpdateProfile}>{t('settings.commit_updates')}</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`wa-settings-content custom-scrollbar ${!activeSettingsTab ? 'no-padding' : ''}`}>
                            <div className={activeSettingsTab ? 'wa-settings-content-inner' : 'wa-settings-full-height'}>
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`wa-app-container ${selectedUser ? 'chat-active' : 'list-active'}`}>
            {renderLeftSidebar()}
            {isSettingsOpen ? (
                renderSettingsPanel()
            ) : (
                <>
                    {renderLeftPanel()}
                    {/* Right Side Panel (Main Chat + Overlays) */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', height: '100%' }}>
                        {/* Main Chat always mounted to preserve scroll */}
                        {renderMainChat()}

                        {/* File Preview Overlay (Restricted to Chat Area) */}
                        {file && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', flexDirection: 'column', background: '#e9edef' }}>
                                {renderFilePreview()}
                            </div>
                        )}
                    </div>
                </>
            )}
            {infoMessage && renderMessageInfo()}
            {/* Contact Info Panel at Root Level */}
            {/* Moved inside renderMainChat for desktop side-by-side view */}


            {snackbar && (
                <Snackbar
                    {...snackbar}
                    onClose={() => setSnackbar(null)}
                />
            )}

            {isMuteModalOpen && renderMuteModal()}
            {isForwardModalOpen && renderForwardModal()}

            {/* Language Change Confirmation Modal */}
            {isLangConfirmOpen && pendingLanguage && (
                <div className="wa-lang-confirm-overlay" onClick={() => setIsLangConfirmOpen(false)}>
                    <div className="wa-lang-confirm-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="wa-lang-confirm-title">{t('lang_confirm.title')}</h3>
                        <p className="wa-lang-confirm-desc">
                            {t('lang_confirm.description', { lang: pendingLanguage.split(',')[0].trim() })}
                        </p>
                        <div className="wa-lang-confirm-actions">
                            <button
                                className="wa-lang-confirm-cancel"
                                onClick={() => { setIsLangConfirmOpen(false); setPendingLanguage(null); }}
                            >
                                {t('lang_confirm.cancel')}
                            </button>
                            <button
                                className="wa-lang-confirm-accept"
                                onClick={() => {
                                    setSelectedLanguage(pendingLanguage);
                                    localStorage.setItem('neuChat_language', pendingLanguage);
                                    setIsLangConfirmOpen(false);
                                    setPendingLanguage(null);
                                    // Actually restart the app to apply the language change
                                    window.location.reload();
                                }}
                            >
                                {t('lang_confirm.confirm', { lang: pendingLanguage.split(',')[0].trim() })}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Delete Message"
                message={(() => {
                    if (Array.isArray(msgToDelete)) {
                        // Check if all messages are sent by the user
                        const allMine = msgToDelete.every(id => {
                            const msg = messages.find(m => (m._id === id || m.id === id));
                            return msg && isMeMsg(msg);
                        });

                        if (allMine) {
                            return `Delete ${msgToDelete.length} messages?`;
                        }
                        return `Delete ${msgToDelete.length} messages for yourself?`;
                    }

                    const msg = messages.find(m => (m._id === msgToDelete || m.id === msgToDelete));
                    if (!msg) return "Are you sure you want to delete this message?";

                    const isMe = isMeMsg(msg);

                    // Simple message for sent messages (buttons handle the options)
                    if (isMe) {
                        return "Delete message?";
                    }

                    // Message for received messages
                    return "Delete this message for yourself?";
                })()}
                // For sent messages (single or bulk), show two delete buttons
                onConfirmMe={(() => {
                    if (Array.isArray(msgToDelete)) {
                        // Check if all messages are sent by the user
                        const allMine = msgToDelete.every(id => {
                            const msg = messages.find(m => (m._id === id || m.id === id));
                            return msg && isMeMsg(msg);
                        });

                        if (allMine) {
                            return () => {
                                handleBulkDeleteMessage(msgToDelete, 'me');
                                setIsDeleteModalOpen(false);
                                setMsgToDelete(null);
                            };
                        }
                        return undefined;
                    }

                    const msg = messages.find(m => (m._id === msgToDelete || m.id === msgToDelete));
                    if (msg && isMeMsg(msg)) {
                        return () => {
                            handleDeleteMessage(msgToDelete, 'me');
                            setIsDeleteModalOpen(false);
                            setMsgToDelete(null);
                        };
                    }
                    return undefined;
                })()}
                onConfirmEveryone={(() => {
                    if (Array.isArray(msgToDelete)) {
                        // Check if all messages are sent by the user
                        const allMine = msgToDelete.every(id => {
                            const msg = messages.find(m => (m._id === id || m.id === id));
                            return msg && isMeMsg(msg);
                        });

                        if (allMine) {
                            return () => {
                                handleBulkDeleteMessage(msgToDelete, 'everyone');
                                setIsDeleteModalOpen(false);
                                setMsgToDelete(null);
                            };
                        }
                        return undefined;
                    }

                    const msg = messages.find(m => (m._id === msgToDelete || m.id === msgToDelete));
                    if (msg && isMeMsg(msg)) {
                        return () => {
                            handleDeleteMessage(msgToDelete, 'everyone');
                            setIsDeleteModalOpen(false);
                            setMsgToDelete(null);
                        };
                    }
                    return undefined;
                })()}
                // For received messages or mixed bulk, use standard confirm
                onConfirm={(() => {
                    if (Array.isArray(msgToDelete)) {
                        // Check if any messages are NOT sent by the user (received or mixed)
                        const anyNotMine = msgToDelete.some(id => {
                            const msg = messages.find(m => (m._id === id || m.id === id));
                            return msg && !isMeMsg(msg);
                        });

                        if (anyNotMine || msgToDelete.length === 0) {
                            return confirmDelete;
                        }
                        return undefined;
                    }

                    const msg = messages.find(m => (m._id === msgToDelete || m.id === msgToDelete));
                    if (msg && !isMeMsg(msg)) {
                        return confirmDelete;
                    }
                    return undefined;
                })()}
                confirmText="Delete"
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setMsgToDelete(null);
                    setDeleteOption('me');
                }}
            />

            {viewingImage && renderImageViewer()}
            {previewVideoUrl && (
                <div className="wa-video-preview-overlay-fixed" onClick={() => setPreviewVideoUrl(null)}>
                    <div className="wa-video-preview-container" onClick={(e) => e.stopPropagation()}>
                        <div className="wa-video-preview-header">
                            <span>Video Preview</span>
                            <button className="wa-video-preview-close" onClick={() => setPreviewVideoUrl(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="wa-video-preview-body">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(previewVideoUrl)}?autoplay=1`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
            {renderChatContextMenu()}
            {renderCameraModals()}
        </div>
    );
}