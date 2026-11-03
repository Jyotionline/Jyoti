JYOTI STORE 2.0 — সেটআপ গাইড (বাংলা)
======================================

গুরুত্বপূর্ণ:
- এটি একটি নতুন, আলাদা প্রজেক্টের starter ZIP। পুরোনো jyoti-store-5255 / jyotii.web.app প্রজেক্টে কিছু পরিবর্তন করে না।
- এখনই এটি সম্পূর্ণ live payment store নয়। প্রথমে Firebase config, security rules, Admin claim, Functions এবং Razorpay Dashboard setup করতে হবে।
- Razorpay Secret Key, webhook secret বা Firebase Admin SDK private key কোনো HTML/JS ফাইলে দেবেন না।
- customer page-এ Admin link ইচ্ছাকৃতভাবে রাখা হয়নি। Admin URL আলাদা: /admin.html

ফাইলের পরিচয়:
- index.html: হোম ও প্রোডাক্ট লিস্ট
- product.html: প্রোডাক্ট ডিটেইল ও review area
- cart.html: কার্ট, ₹199 minimum
- checkout.html: ঠিকানা ও secure-payment placeholder
- account.html: phone OTP login ও saved address UI
- orders.html: customer orders UI
- about.html / contact.html: তথ্যের পেজ
- admin.html: আলাদা Admin Panel
- styles.css / app.js: ডিজাইন ও frontend logic
- firebase-config.js: নতুন Firebase web app config বসানোর জায়গা
- firestore.rules: ডেটাবেস security rules
- functions/: Razorpay secure backend starter

প্রথম ধাপ — নতুন Firebase প্রজেক্ট:
1. https://console.firebase.google.com খুলুন।
2. Add project / Create a project নির্বাচন করুন।
3. নাম দিন: Jyoti Store 2.0। পুরোনো jyoti-store-5255 নির্বাচন করবেন না।
4. Project তৈরি হলে Project Overview-এ Web (</>) আইকনে চাপুন।
5. App nickname দিন Jyoti Store Web, Register app করুন।
6. Firebase config object কপি করে firebase-config.js-এ placeholder value-গুলো বদলান।
7. Authentication > Sign-in method-এ Phone এবং Email/Password enable করুন।
8. Firestore Database তৈরি করুন; আপাতত Production mode বেছে নিন।
9. Hosting চালু করুন।

Admin account নিরাপত্তা:
- Authentication-এ admin email/password account তৈরি করা একাই যথেষ্ট নয়।
- Admin claim `admin: true` trusted Admin SDK environment থেকে project owner-কে নিজে সেট করতে হবে।
- Browser থেকে নিজেকে admin বানানোর কোনো button বা public function তৈরি করবেন না।
- Firestore rules publish করুন; কিন্তু প্রথমে test mode/public write rules ব্যবহার করবেন না।

Firebase Hosting deploy (Termux):
1. ZIP extract করে Jyoti_Store_2_0 ফোল্ডারে যান।
2. Termux-এ Node.js/Firebase CLI আগে না থাকলে সেটআপ করতে হবে।
3. `npm install -g firebase-tools`
4. `firebase login`
5. `firebase use --add` — শুধু নতুন Jyoti Store 2.0 project নির্বাচন করুন।
6. `firebase deploy --only hosting,firestore:rules`
7. Functions deploy-এর আগে Functions-এর dependencies install করুন এবং billing/plan availability পরীক্ষা করুন:
   `cd functions && npm install`
   তারপর project root-এ ফিরে `firebase deploy --only functions`

Razorpay:
- Razorpay merchant account তৈরি/verify করুন এবং Test Mode-এ আগে পরীক্ষা করুন।
- Firebase Functions secrets সেট করুন:
  `firebase functions:secrets:set RAZORPAY_KEY_ID`
  `firebase functions:secrets:set RAZORPAY_KEY_SECRET`
  `firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET`
- Test/live key values যথাযথভাবে দিন।
- Razorpay Dashboard-এ deployed `razorpayWebhook` endpoint URL যোগ করুন; `payment.captured` ও `payment.failed` events enable করুন।
- Live payment নেওয়ার আগে test order, failed payment, duplicate webhook, stock race condition, refund/cancel flow এবং order access rules পরীক্ষা করান।
- Payment integration-এর frontend checkout launcher এখনও সংযুক্ত করতে হবে; checkout page ইচ্ছাকৃতভাবে payment complete দেখায় না যতক্ষণ backend setup শেষ না হয়।

বর্তমান starter-এর সীমা:
- Home page-এ demo sample products দেখায়; Firebase-এর products collection-এ real product add করলে live list আসবে।
- Product/admin management UI আছে, কিন্তু Firebase config + admin claim + rules deploy না করলে কাজ করবে না।
- Phone OTP UI আছে; Firebase Phone provider, authorized domains এবং reCAPTCHA setup করতে হবে।
- Review form ইচ্ছাকৃতভাবে review submit করতে দেয় না, কারণ verified completed purchase যাচাই secure backend-এ যোগ করা প্রয়োজন।
- Checkout page ইচ্ছাকৃতভাবে payment successful বলে না। Razorpay order creation/verification/webhook backend starter আছে, তবে frontend checkout flow wiring, address-to-order persistence, review verification, and full end-to-end testing still need completion.
- Rules অনুযায়ী customer order create করার আগে authenticated UID এবং pending payment/status fields দরকার। Production checkout function-এ address validation ও order creation যুক্ত করুন।
- Do not publish the website and accept real money until the above items are complete and tested.

দ্রুত পরীক্ষা:
- ZIP extract করে local static server/Firebase Hosting-এ খুলুন; direct file:// mode-এ module imports কাজ নাও করতে পারে।
- Firebase config বসানোর আগে demo product cards, responsive layout, cart and ₹199 minimum preview করা যাবে।
- Customer page-এ Admin link নেই। Admin panel সরাসরি /admin.html থেকে খোলে।
