import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export type Lang = "en" | "hi" | "mr";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  en: {
    appName: "AgriConnect",
    chooseLanguage: "Choose your language",
    continueBtn: "Continue",
    whoAreYou: "Who are you?",
    iAmFarmer: "I am a Farmer",
    iAmBuyer: "I am a Buyer",
    iAmDriver: "I am a Driver",
    farmerTagline: "Sell your crops directly to buyers",
    buyerTagline: "Browse the marketplace and order",
    driverTagline: "Pick up and deliver orders",
    back: "Back",
    farmerLogin: "Farmer Login",
    buyerLogin: "Buyer Login",
    driverLogin: "Driver Login",
    enterPhone: "Enter your phone number",
    phonePlaceholder: "Phone number",
    lookingUp: "Looking up...",
    noFarmer: "No farmer found with that phone number.",
    noBuyer: "No buyer found with that phone number.",
    noDriver: "No driver found with that phone number.",
    welcome: "Welcome",
    logout: "Logout",
    trustScore: "Trust score",
    createListing: "Create New Listing",
    cropType: "Crop type",
    quantityKg: "Quantity (kg)",
    pricePerKg: "Price/kg",
    adding: "Adding...",
    addListing: "Add Listing",
    myListings: "My Listings",
    noListings: "No listings yet.",
    yourOrders: "Your Orders",
    myOrders: "My Orders",
    noOrders: "No orders yet.",
    noOrdersBuyer: "You haven't placed any orders yet.",
    buyer: "Buyer",
    farmer: "Farmer",
    driver: "Driver",
    total: "Total",
    status: "Status",
    acceptOrder: "Accept Order",
    declineOrder: "Decline Order",
    markDelivered: "Mark as Delivered",
    marketplace: "Marketplace",
    noActiveListings: "No active listings.",
    available: "available",
    qtyKg: "Qty (kg)",
    orderNow: "Order Now",
    availablePickups: "Available Pickup Requests",
    noAvailablePickups: "No pickup requests available right now.",
    acceptPickup: "Accept Pickup",
    myDeliveries: "My Deliveries",
    noDeliveries: "No deliveries assigned yet.",
    vehicle: "Vehicle",
    village: "Village",
    statusPlaced: "placed",
    statusConfirmed: "confirmed",
    statusDelivered: "delivered",
    statusCancelled: "cancelled",
    changeLanguage: "Change language",
    startDelivery: "Start Delivery",
    giveCodeToBuyer: "Give this code to the buyer to confirm delivery:",
    enterDeliveryCode: "Enter the delivery code given to you by the driver",
    confirmDelivery: "Confirm Delivery",
    incorrectCode: "Incorrect code, please try again.",
    flaggedForReview: "Too many incorrect attempts. This order has been flagged for review.",
    deliveryConfirmed: "Delivery confirmed. Thank you!",
    codePlaceholder: "6-digit code",
    sendOtp: "Send OTP",
    verifyOtp: "Verify OTP",
    enterOtp: "Enter the 6-digit code sent to your phone",
    otpSentTo: "Code sent to",
    changePhone: "Change phone number",
    otpSendFailed: "Could not send code. Please try again.",
    registerTitle: "Complete your registration",
    registerHint: "We couldn't find an account for that phone number. Please fill in your details to register.",
    yourName: "Your name",
    villageLabel: "Village",
    businessType: "Business type",
    businessHousehold: "Household",
    businessRestaurant: "Restaurant",
    businessHotel: "Hotel",
    businessSupermarket: "Supermarket",
    vehicleType: "Vehicle type",
    vehicleReg: "Vehicle registration number",
    registerBtn: "Register & Continue",
    registering: "Registering...",
  },
  hi: {
    appName: "एग्रीकनेक्ट",
    chooseLanguage: "अपनी भाषा चुनें",
    continueBtn: "जारी रखें",
    whoAreYou: "आप कौन हैं?",
    iAmFarmer: "मैं किसान हूँ",
    iAmBuyer: "मैं खरीदार हूँ",
    iAmDriver: "मैं ड्राइवर हूँ",
    farmerTagline: "अपनी फसल सीधे खरीदारों को बेचें",
    buyerTagline: "बाज़ार देखें और ऑर्डर करें",
    driverTagline: "ऑर्डर उठाएँ और पहुँचाएँ",
    back: "वापस",
    farmerLogin: "किसान लॉगिन",
    buyerLogin: "खरीदार लॉगिन",
    driverLogin: "ड्राइवर लॉगिन",
    enterPhone: "अपना फ़ोन नंबर दर्ज करें",
    phonePlaceholder: "फ़ोन नंबर",
    lookingUp: "खोज रहे हैं...",
    noFarmer: "इस फ़ोन नंबर से कोई किसान नहीं मिला।",
    noBuyer: "इस फ़ोन नंबर से कोई खरीदार नहीं मिला।",
    noDriver: "इस फ़ोन नंबर से कोई ड्राइवर नहीं मिला।",
    welcome: "स्वागत है",
    logout: "लॉगआउट",
    trustScore: "विश्वास अंक",
    createListing: "नई लिस्टिंग बनाएँ",
    cropType: "फसल का प्रकार",
    quantityKg: "मात्रा (किग्रा)",
    pricePerKg: "मूल्य/किग्रा",
    adding: "जोड़ रहे हैं...",
    addListing: "लिस्टिंग जोड़ें",
    myListings: "मेरी लिस्टिंग",
    noListings: "अभी कोई लिस्टिंग नहीं।",
    yourOrders: "आपके ऑर्डर",
    myOrders: "मेरे ऑर्डर",
    noOrders: "अभी कोई ऑर्डर नहीं।",
    noOrdersBuyer: "आपने अभी तक कोई ऑर्डर नहीं दिया है।",
    buyer: "खरीदार",
    farmer: "किसान",
    driver: "ड्राइवर",
    total: "कुल",
    status: "स्थिति",
    acceptOrder: "ऑर्डर स्वीकारें",
    declineOrder: "ऑर्डर अस्वीकारें",
    markDelivered: "डिलीवर्ड चिह्नित करें",
    marketplace: "बाज़ार",
    noActiveListings: "कोई सक्रिय लिस्टिंग नहीं।",
    available: "उपलब्ध",
    qtyKg: "मात्रा (किग्रा)",
    orderNow: "अभी ऑर्डर करें",
    availablePickups: "उपलब्ध पिकअप अनुरोध",
    noAvailablePickups: "अभी कोई पिकअप अनुरोध उपलब्ध नहीं।",
    acceptPickup: "पिकअप स्वीकारें",
    myDeliveries: "मेरी डिलीवरी",
    noDeliveries: "अभी कोई डिलीवरी नहीं सौंपी गई।",
    vehicle: "वाहन",
    village: "गाँव",
    statusPlaced: "दिया गया",
    statusConfirmed: "स्वीकृत",
    statusDelivered: "पहुँचाया गया",
    statusCancelled: "रद्द",
    changeLanguage: "भाषा बदलें",
    startDelivery: "डिलीवरी शुरू करें",
    giveCodeToBuyer: "डिलीवरी की पुष्टि के लिए यह कोड खरीदार को दें:",
    enterDeliveryCode: "ड्राइवर द्वारा दिया गया डिलीवरी कोड दर्ज करें",
    confirmDelivery: "डिलीवरी की पुष्टि करें",
    incorrectCode: "गलत कोड, कृपया पुनः प्रयास करें।",
    flaggedForReview: "बहुत सारे गलत प्रयास। यह ऑर्डर समीक्षा के लिए चिह्नित किया गया है।",
    deliveryConfirmed: "डिलीवरी की पुष्टि हो गई। धन्यवाद!",
    codePlaceholder: "6-अंकीय कोड",
    sendOtp: "OTP भेजें",
    verifyOtp: "OTP सत्यापित करें",
    enterOtp: "अपने फ़ोन पर भेजा गया 6-अंकीय कोड दर्ज करें",
    otpSentTo: "कोड भेजा गया",
    changePhone: "फ़ोन नंबर बदलें",
    otpSendFailed: "कोड भेजा नहीं जा सका। कृपया पुनः प्रयास करें।",
  },
  mr: {
    appName: "अ‍ॅग्रीकनेक्ट",
    chooseLanguage: "तुमची भाषा निवडा",
    continueBtn: "पुढे जा",
    whoAreYou: "तुम्ही कोण आहात?",
    iAmFarmer: "मी शेतकरी आहे",
    iAmBuyer: "मी खरेदीदार आहे",
    iAmDriver: "मी ड्रायव्हर आहे",
    farmerTagline: "तुमची पिके थेट खरेदीदारांना विका",
    buyerTagline: "बाजार पहा आणि ऑर्डर करा",
    driverTagline: "ऑर्डर उचला आणि पोहोचवा",
    back: "मागे",
    farmerLogin: "शेतकरी लॉगिन",
    buyerLogin: "खरेदीदार लॉगिन",
    driverLogin: "ड्रायव्हर लॉगिन",
    enterPhone: "तुमचा फोन नंबर टाका",
    phonePlaceholder: "फोन नंबर",
    lookingUp: "शोधत आहे...",
    noFarmer: "या फोन नंबरने कोणीही शेतकरी सापडला नाही.",
    noBuyer: "या फोन नंबरने कोणीही खरेदीदार सापडला नाही.",
    noDriver: "या फोन नंबरने कोणीही ड्रायव्हर सापडला नाही.",
    welcome: "स्वागत आहे",
    logout: "लॉगआउट",
    trustScore: "विश्वास गुण",
    createListing: "नवीन लिस्टिंग तयार करा",
    cropType: "पिकाचा प्रकार",
    quantityKg: "प्रमाण (किलो)",
    pricePerKg: "किंमत/किलो",
    adding: "जोडत आहे...",
    addListing: "लिस्टिंग जोडा",
    myListings: "माझ्या लिस्टिंग",
    noListings: "अद्याप कोणतीही लिस्टिंग नाही.",
    yourOrders: "तुमचे ऑर्डर",
    myOrders: "माझे ऑर्डर",
    noOrders: "अद्याप कोणतेही ऑर्डर नाहीत.",
    noOrdersBuyer: "तुम्ही अद्याप कोणतेही ऑर्डर दिले नाहीत.",
    buyer: "खरेदीदार",
    farmer: "शेतकरी",
    driver: "ड्रायव्हर",
    total: "एकूण",
    status: "स्थिती",
    acceptOrder: "ऑर्डर स्वीकारा",
    declineOrder: "ऑर्डर नाकारा",
    markDelivered: "डिलिव्हर केले म्हणून चिन्हांकित करा",
    marketplace: "बाजारपेठ",
    noActiveListings: "कोणतीही सक्रिय लिस्टिंग नाही.",
    available: "उपलब्ध",
    qtyKg: "प्रमाण (किलो)",
    orderNow: "आता ऑर्डर करा",
    availablePickups: "उपलब्ध पिकअप विनंत्या",
    noAvailablePickups: "सध्या कोणतीही पिकअप विनंती उपलब्ध नाही.",
    acceptPickup: "पिकअप स्वीकारा",
    myDeliveries: "माझ्या डिलिव्हरी",
    noDeliveries: "अद्याप कोणतीही डिलिव्हरी नियुक्त नाही.",
    vehicle: "वाहन",
    village: "गाव",
    statusPlaced: "दिले",
    statusConfirmed: "स्वीकारले",
    statusDelivered: "पोहोचवले",
    statusCancelled: "रद्द",
    changeLanguage: "भाषा बदला",
    startDelivery: "डिलिव्हरी सुरू करा",
    giveCodeToBuyer: "डिलिव्हरीची पुष्टी करण्यासाठी हा कोड खरेदीदाराला द्या:",
    enterDeliveryCode: "ड्रायव्हरने दिलेला डिलिव्हरी कोड टाका",
    confirmDelivery: "डिलिव्हरीची पुष्टी करा",
    incorrectCode: "चुकीचा कोड, कृपया पुन्हा प्रयत्न करा.",
    flaggedForReview: "खूप चुकीचे प्रयत्न. हा ऑर्डर पुनरावलोकनासाठी चिन्हांकित केला आहे.",
    deliveryConfirmed: "डिलिव्हरीची पुष्टी झाली. धन्यवाद!",
    codePlaceholder: "6-अंकी कोड",
    sendOtp: "OTP पाठवा",
    verifyOtp: "OTP सत्यापित करा",
    enterOtp: "तुमच्या फोनवर पाठवलेला 6-अंकी कोड टाका",
    otpSentTo: "कोड पाठवला",
    changePhone: "फोन नंबर बदला",
    otpSendFailed: "कोड पाठवता आला नाही. कृपया पुन्हा प्रयत्न करा.",
  },
};

type Ctx = {
  lang: Lang | null;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof translations.en) => string;
};

const LanguageContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "agriconnect.lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "hi" || stored === "mr") setLangState(stored);
    } catch {}
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      sessionStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }

  function t(key: keyof typeof translations.en) {
    const active = lang ?? "en";
    return translations[active][key] ?? translations.en[key] ?? String(key);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t } = useLang();
  return (
    <Link
      to="/language"
      className={`text-xs text-muted-foreground hover:underline ${className}`}
    >
      🌐 {t("changeLanguage")}
    </Link>
  );
}
