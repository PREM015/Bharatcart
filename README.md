
# 🛒 BharatCart – Fullstack E-Commerce Website

BharatCart is a modern fullstack **E-Commerce platform** built with **Next.js 14 (App Router)**, **Prisma ORM**, and **Supabase (Postgres)**.  
It supports user authentication, product management, cart, orders, and an admin panel to manage the store.

🚀 **Live Demo:** [bharatcart-ten.vercel.app](https://bharatcart-ten.vercel.app/)

---

## ✨ Features

### 👤 User Features
- User authentication (login / register)
- Browse products with categories
- Product details with images, ratings, and reviews
- Add to cart & update quantities
- Checkout flow with orders
- Responsive & mobile-friendly UI

### 🛠 Admin Features
- Add / Edit / Delete products
- Manage categories
- Manage orders & users
- Dashboard view for analytics

---

## 🏗 Tech Stack

- **Frontend:** [Next.js 14](https://nextjs.org/), React, TypeScript, TailwindCSS, shadcn/ui  
- **Backend:** Next.js API routes, Prisma ORM  
- **Database:** Supabase (Postgres)  
- **Authentication:** NextAuth.js (with JWT)  
- **Deployment:** [Vercel](https://vercel.com/)  

---

## 📂 Project Structure

```

src/
│── app/                  # Next.js App Router
│   ├── api/              # API routes
│   │   ├── products/     # Product APIs
│   │   ├── categories/   # Category APIs
│   │   ├── cart/         # Cart APIs
│   │   ├── orders/       # Order APIs
│   │   └── users/        # User APIs
│   └── (pages)/          # UI pages (login, register, cart, product, admin etc.)
│
│── lib/                  # Core backend logic
│   ├── controllers/      # Request controllers
│   ├── models/           # Prisma database models
│   ├── validators/       # Zod validators
│   ├── middleware/       # Middlewares (e.g., input validation)
│   └── db.ts             # Prisma client instance
│
│── constants/            # Static data (e.g., avatars, config)
│── types/                # TypeScript types

````

---

## ⚙️ Setup Instructions (Local)

1. **Clone repository**
   ```bash
   git clone https://github.com/your-username/bharatcart.git
   cd bharatcart
````

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env` file in the root:

   ```env
   DATABASE_URL="your-supabase-postgres-url"
   NEXTAUTH_SECRET="your-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Run Prisma migrations**

   ```bash
   npx prisma migrate dev
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. Visit: `http://localhost:3000`

---

## 🚀 Deployment (Vercel)

* Push your code to GitHub
* Connect the repo on [Vercel](https://vercel.com)
* Add environment variables in Vercel Dashboard
* Vercel auto-builds and deploys the app 🎉

---

## 🤝 Contributing

Feel free to fork and create PRs.
Suggestions & improvements are welcome!

---

## 📜 License

MIT License © 2025 BharatCart.




```
ecommerce
├─ .cpp
├─ eslint.config.mjs
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ prisma
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ images
│  │  ├─ banners
│  │  │  ├─ beauty-banner.png
│  │  │  ├─ electronics-banner.png
│  │  │  ├─ fashion-banner.png
│  │  │  ├─ groceries-banner.png
│  │  │  ├─ home-banner.png
│  │  │  └─ kitchen-banner.png
│  │  ├─ BharatCart Logo.png
│  │  ├─ brands
│  │  │  ├─ apple.png
│  │  │  ├─ dell.png
│  │  │  ├─ hp.png
│  │  │  ├─ lg.png
│  │  │  ├─ nestle.png
│  │  │  ├─ nike.jpg
│  │  │  ├─ samsung.png
│  │  │  ├─ sony.png
│  │  │  ├─ unilever.png
│  │  │  └─ zara.jpg
│  │  ├─ categories
│  │  │  ├─ beauty.png
│  │  │  ├─ clothing.png
│  │  │  ├─ electronics.png
│  │  │  ├─ groceries.png
│  │  │  ├─ home-appliance.png
│  │  │  └─ kitchen.png
│  │  ├─ products
│  │  │  ├─ accessories
│  │  │  │  ├─ bags
│  │  │  │  │  ├─ img1.jpg
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  ├─ belts
│  │  │  │  │  ├─ img1.jpg
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  ├─ jewelry
│  │  │  │  │  ├─ img1.jpg
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  ├─ sunglasses
│  │  │  │  │  ├─ img1.jpg
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  └─ watches
│  │  │  │     ├─ img1.jpg
│  │  │  │     ├─ img2.jpg
│  │  │  │     ├─ img3.jpg
│  │  │  │     ├─ img4.jpg
│  │  │  │     └─ img5.jpg
│  │  │  ├─ beauty
│  │  │  │  ├─ fragrances
│  │  │  │  │  ├─ img1.png
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  ├─ haircare
│  │  │  │  │  ├─ img1.png
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  ├─ makeup
│  │  │  │  │  ├─ img1.jpg
│  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  └─ img5.jpg
│  │  │  │  └─ skincare
│  │  │  │     ├─ img1.jpg
│  │  │  │     ├─ img2.jpg
│  │  │  │     ├─ img3.jpg
│  │  │  │     ├─ img4.jpg
│  │  │  │     └─ img5.jpg
│  │  │  ├─ best-deals
│  │  │  ├─ clothing
│  │  │  │  ├─ kids
│  │  │  │  │  ├─ baby
│  │  │  │  │  │  ├─ img1.webp
│  │  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  │  └─ img5.jpg
│  │  │  │  │  ├─ boys
│  │  │  │  │  │  ├─ img1.jpg
│  │  │  │  │  │  ├─ img2.jpg
│  │  │  │  │  │  ├─ img3.jpg
│  │  │  │  │  │  ├─ img4.jpg
│  │  │  │  │  │  └─ img5.jpg
│  │  │  │  │  └─ girls
│  │  │  │  │     ├─ img1.jpg
│  │  │  │  │     ├─ img2.jpg
│  │  │  │  │     ├─ img3.jpg
│  │  │  │  │     ├─ img4.jpg
│  │  │  │  │     ├─ img5.jpg
│  │  │  │  │     └─ img6.webp
│  │  │  │  ├─ men
│  │  │  │  │  ├─ ethnic
│  │  │  │  │  │  ├─ img1.webp
│  │  │  │  │  │  ├─ img2.webp
│  │  │  │  │  │  ├─ img3.webp
│  │  │  │  │  │  ├─ img4.webp
│  │  │  │  │  │  └─ img5.webp
│  │  │  │  │  ├─ jackets
│  │  │  │  │  │  ├─ img1.webp
│  │  │  │  │  │  ├─ img2.webp
│  │  │  │  │  │  ├─ img3.webp
│  │  │  │  │  │  ├─ img4.webp
│  │  │  │  │  │  └─ img5.webp
│  │  │  │  │  ├─ jeans
│  │  │  │  │  │  ├─ img1.webp
│  │  │  │  │  │  ├─ img2.webp
│  │  │  │  │  │  ├─ img3.webp
│  │  │  │  │  │  ├─ img4.webp
│  │  │  │  │  │  └─ img5.webp
│  │  │  │  │  ├─ shirts
│  │  │  │  │  │  ├─ img1.webp
│  │  │  │  │  │  ├─ img2.webp
│  │  │  │  │  │  ├─ img3.webp
│  │  │  │  │  │  ├─ img4.webp
│  │  │  │  │  │  └─ img5.webp
│  │  │  │  │  └─ tshirts
│  │  │  │  │     ├─ img1.webp
│  │  │  │  │     ├─ img2.webp
│  │  │  │  │     ├─ img3.webp
│  │  │  │  │     ├─ img4.webp
│  │  │  │  │     └─ img5.webp
│  │  │  │  └─ women
│  │  │  │     ├─ dresses
│  │  │  │     │  ├─ img1.webp
│  │  │  │     │  ├─ img2.webp
│  │  │  │     │  ├─ img3.webp
│  │  │  │     │  ├─ img4.webp
│  │  │  │     │  └─ img5.webp
│  │  │  │     ├─ ethnic
│  │  │  │     │  ├─ img1.webp
│  │  │  │     │  ├─ img2.webp
│  │  │  │     │  ├─ img3.webp
│  │  │  │     │  ├─ img4.webp
│  │  │  │     │  └─ img5.webp
│  │  │  │     ├─ jeans
│  │  │  │     │  ├─ img1.webp
│  │  │  │     │  ├─ img2.webp
│  │  │  │     │  ├─ img3.webp
│  │  │  │     │  ├─ img4.webp
│  │  │  │     │  └─ img5.webp
│  │  │  │     ├─ sarees
│  │  │  │     │  ├─ img1.webp
│  │  │  │     │  ├─ img2.webp
│  │  │  │     │  ├─ img3.webp
│  │  │  │     │  ├─ img4.webp
│  │  │  │     │  └─ img5.webp
│  │  │  │     └─ tops
│  │  │  │        ├─ img1.webp
│  │  │  │        ├─ img2.webp
│  │  │  │        ├─ img3.webp
│  │  │  │        ├─ img4.webp
│  │  │  │        └─ img5.webp
│  │  │  ├─ electronics
│  │  │  │  ├─ accessories
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ gaming
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ laptops
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ mobiles
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  └─ televisions
│  │  │  │     ├─ img1.webp
│  │  │  │     ├─ img2.webp
│  │  │  │     ├─ img3.webp
│  │  │  │     ├─ img4.webp
│  │  │  │     └─ img5.webp
│  │  │  ├─ featured
│  │  │  ├─ footwear
│  │  │  │  ├─ kids
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ men
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  └─ women
│  │  │  │     ├─ img1.webp
│  │  │  │     ├─ img2.webp
│  │  │  │     ├─ img3.webp
│  │  │  │     ├─ img4.webp
│  │  │  │     └─ img5.webp
│  │  │  ├─ groceries
│  │  │  │  ├─ beverages
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ dairy
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ fruits
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ snacks
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  └─ vegetables
│  │  │  │     ├─ img1.webp
│  │  │  │     ├─ img2.webp
│  │  │  │     ├─ img3.webp
│  │  │  │     ├─ img4.webp
│  │  │  │     └─ img5.webp
│  │  │  ├─ home-appliances
│  │  │  │  ├─ cleaning
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ cooling
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  ├─ kitchen
│  │  │  │  │  ├─ img1.webp
│  │  │  │  │  ├─ img2.webp
│  │  │  │  │  ├─ img3.webp
│  │  │  │  │  ├─ img4.webp
│  │  │  │  │  └─ img5.webp
│  │  │  │  └─ laundry
│  │  │  │     ├─ img1.webp
│  │  │  │     ├─ img2.webp
│  │  │  │     ├─ img3.webp
│  │  │  │     ├─ img4.webp
│  │  │  │     └─ img5.webp
│  │  │  ├─ new-arrivals
│  │  │  └─ trending
│  │  ├─ ui
│  │  │  ├─ avatar-placeholder
│  │  │  │  ├─ boy
│  │  │  │  │  ├─ AV1.png
│  │  │  │  │  ├─ AV10.png
│  │  │  │  │  ├─ AV11.png
│  │  │  │  │  ├─ AV12.png
│  │  │  │  │  ├─ AV13.png
│  │  │  │  │  ├─ AV14.png
│  │  │  │  │  ├─ AV15.png
│  │  │  │  │  ├─ AV16.png
│  │  │  │  │  ├─ AV17.png
│  │  │  │  │  ├─ AV18.png
│  │  │  │  │  ├─ AV19.png
│  │  │  │  │  ├─ AV2.png
│  │  │  │  │  ├─ AV20.png
│  │  │  │  │  ├─ AV21.png
│  │  │  │  │  ├─ AV22.png
│  │  │  │  │  ├─ AV23.png
│  │  │  │  │  ├─ AV24.png
│  │  │  │  │  ├─ AV25.png
│  │  │  │  │  ├─ AV26.png
│  │  │  │  │  ├─ AV27.png
│  │  │  │  │  ├─ AV28.png
│  │  │  │  │  ├─ AV29.png
│  │  │  │  │  ├─ AV3.png
│  │  │  │  │  ├─ AV30.png
│  │  │  │  │  ├─ AV31.png
│  │  │  │  │  ├─ AV32.png
│  │  │  │  │  ├─ AV33.png
│  │  │  │  │  ├─ AV34.png
│  │  │  │  │  ├─ AV35.png
│  │  │  │  │  ├─ AV36.png
│  │  │  │  │  ├─ AV37.png
│  │  │  │  │  ├─ AV38.png
│  │  │  │  │  ├─ AV39.png
│  │  │  │  │  ├─ AV4.png
│  │  │  │  │  ├─ AV40.png
│  │  │  │  │  ├─ AV41.png
│  │  │  │  │  ├─ AV42.png
│  │  │  │  │  ├─ AV43.png
│  │  │  │  │  ├─ AV44.png
│  │  │  │  │  ├─ AV45.png
│  │  │  │  │  ├─ AV46.png
│  │  │  │  │  ├─ AV47.png
│  │  │  │  │  ├─ AV48.png
│  │  │  │  │  ├─ AV49.png
│  │  │  │  │  ├─ AV5.png
│  │  │  │  │  ├─ AV50.png
│  │  │  │  │  ├─ AV6.png
│  │  │  │  │  ├─ AV7.png
│  │  │  │  │  ├─ AV8.png
│  │  │  │  │  └─ AV9.png
│  │  │  │  ├─ girl
│  │  │  │  │  ├─ AV100.png
│  │  │  │  │  ├─ AV51.png
│  │  │  │  │  ├─ AV52.png
│  │  │  │  │  ├─ AV53.png
│  │  │  │  │  ├─ AV54.png
│  │  │  │  │  ├─ AV55.png
│  │  │  │  │  ├─ AV56.png
│  │  │  │  │  ├─ AV57.png
│  │  │  │  │  ├─ AV58.png
│  │  │  │  │  ├─ AV59.png
│  │  │  │  │  ├─ AV60.png
│  │  │  │  │  ├─ AV61.png
│  │  │  │  │  ├─ AV62.png
│  │  │  │  │  ├─ AV63.png
│  │  │  │  │  ├─ AV64.png
│  │  │  │  │  ├─ AV65.png
│  │  │  │  │  ├─ AV66.png
│  │  │  │  │  ├─ AV67.png
│  │  │  │  │  ├─ AV68.png
│  │  │  │  │  ├─ AV69.png
│  │  │  │  │  ├─ AV70.png
│  │  │  │  │  ├─ AV71.png
│  │  │  │  │  ├─ AV72.png
│  │  │  │  │  ├─ AV73.png
│  │  │  │  │  ├─ AV74.png
│  │  │  │  │  ├─ AV75.png
│  │  │  │  │  ├─ AV76.png
│  │  │  │  │  ├─ AV77.png
│  │  │  │  │  ├─ AV78.png
│  │  │  │  │  ├─ AV79.png
│  │  │  │  │  ├─ AV80.png
│  │  │  │  │  ├─ AV81.png
│  │  │  │  │  ├─ AV82.png
│  │  │  │  │  ├─ AV83.png
│  │  │  │  │  ├─ AV84.png
│  │  │  │  │  ├─ AV85.png
│  │  │  │  │  ├─ AV86.png
│  │  │  │  │  ├─ AV87.png
│  │  │  │  │  ├─ AV88.png
│  │  │  │  │  ├─ AV89.png
│  │  │  │  │  ├─ AV90.png
│  │  │  │  │  ├─ AV91.png
│  │  │  │  │  ├─ AV92.png
│  │  │  │  │  ├─ AV93.png
│  │  │  │  │  ├─ AV94.png
│  │  │  │  │  ├─ AV95.png
│  │  │  │  │  ├─ AV96.png
│  │  │  │  │  ├─ AV97.png
│  │  │  │  │  ├─ AV98.png
│  │  │  │  │  └─ AV99.png
│  │  │  │  ├─ id
│  │  │  │  │  ├─ AV1.png
│  │  │  │  │  ├─ AV10.png
│  │  │  │  │  ├─ AV100.png
│  │  │  │  │  ├─ AV11.png
│  │  │  │  │  ├─ AV12.png
│  │  │  │  │  ├─ AV13.png
│  │  │  │  │  ├─ AV14.png
│  │  │  │  │  ├─ AV15.png
│  │  │  │  │  ├─ AV16.png
│  │  │  │  │  ├─ AV17.png
│  │  │  │  │  ├─ AV18.png
│  │  │  │  │  ├─ AV19.png
│  │  │  │  │  ├─ AV2.png
│  │  │  │  │  ├─ AV20.png
│  │  │  │  │  ├─ AV21.png
│  │  │  │  │  ├─ AV22.png
│  │  │  │  │  ├─ AV23.png
│  │  │  │  │  ├─ AV24.png
│  │  │  │  │  ├─ AV25.png
│  │  │  │  │  ├─ AV26.png
│  │  │  │  │  ├─ AV27.png
│  │  │  │  │  ├─ AV28.png
│  │  │  │  │  ├─ AV29.png
│  │  │  │  │  ├─ AV3.png
│  │  │  │  │  ├─ AV30.png
│  │  │  │  │  ├─ AV31.png
│  │  │  │  │  ├─ AV32.png
│  │  │  │  │  ├─ AV33.png
│  │  │  │  │  ├─ AV34.png
│  │  │  │  │  ├─ AV35.png
│  │  │  │  │  ├─ AV36.png
│  │  │  │  │  ├─ AV37.png
│  │  │  │  │  ├─ AV38.png
│  │  │  │  │  ├─ AV39.png
│  │  │  │  │  ├─ AV4.png
│  │  │  │  │  ├─ AV40.png
│  │  │  │  │  ├─ AV41.png
│  │  │  │  │  ├─ AV42.png
│  │  │  │  │  ├─ AV43.png
│  │  │  │  │  ├─ AV44.png
│  │  │  │  │  ├─ AV45.png
│  │  │  │  │  ├─ AV46.png
│  │  │  │  │  ├─ AV47.png
│  │  │  │  │  ├─ AV48.png
│  │  │  │  │  ├─ AV49.png
│  │  │  │  │  ├─ AV5.png
│  │  │  │  │  ├─ AV50.png
│  │  │  │  │  ├─ AV51.png
│  │  │  │  │  ├─ AV52.png
│  │  │  │  │  ├─ AV53.png
│  │  │  │  │  ├─ AV54.png
│  │  │  │  │  ├─ AV55.png
│  │  │  │  │  ├─ AV56.png
│  │  │  │  │  ├─ AV57.png
│  │  │  │  │  ├─ AV58.png
│  │  │  │  │  ├─ AV59.png
│  │  │  │  │  ├─ AV6.png
│  │  │  │  │  ├─ AV60.png
│  │  │  │  │  ├─ AV61.png
│  │  │  │  │  ├─ AV62.png
│  │  │  │  │  ├─ AV63.png
│  │  │  │  │  ├─ AV64.png
│  │  │  │  │  ├─ AV65.png
│  │  │  │  │  ├─ AV66.png
│  │  │  │  │  ├─ AV67.png
│  │  │  │  │  ├─ AV68.png
│  │  │  │  │  ├─ AV69.png
│  │  │  │  │  ├─ AV7.png
│  │  │  │  │  ├─ AV70.png
│  │  │  │  │  ├─ AV71.png
│  │  │  │  │  ├─ AV72.png
│  │  │  │  │  ├─ AV73.png
│  │  │  │  │  ├─ AV74.png
│  │  │  │  │  ├─ AV75.png
│  │  │  │  │  ├─ AV76.png
│  │  │  │  │  ├─ AV77.png
│  │  │  │  │  ├─ AV78.png
│  │  │  │  │  ├─ AV79.png
│  │  │  │  │  ├─ AV8.png
│  │  │  │  │  ├─ AV80.png
│  │  │  │  │  ├─ AV81.png
│  │  │  │  │  ├─ AV82.png
│  │  │  │  │  ├─ AV83.png
│  │  │  │  │  ├─ AV84.png
│  │  │  │  │  ├─ AV85.png
│  │  │  │  │  ├─ AV86.png
│  │  │  │  │  ├─ AV87.png
│  │  │  │  │  ├─ AV88.png
│  │  │  │  │  ├─ AV89.png
│  │  │  │  │  ├─ AV9.png
│  │  │  │  │  ├─ AV90.png
│  │  │  │  │  ├─ AV91.png
│  │  │  │  │  ├─ AV92.png
│  │  │  │  │  ├─ AV93.png
│  │  │  │  │  ├─ AV94.png
│  │  │  │  │  ├─ AV95.png
│  │  │  │  │  ├─ AV96.png
│  │  │  │  │  ├─ AV97.png
│  │  │  │  │  ├─ AV98.png
│  │  │  │  │  └─ AV99.png
│  │  │  │  └─ job
│  │  │  │     ├─ astronomer
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ chef
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ designer
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ doctor
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ farmer
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ firefighters
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ lawyer
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ operator
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     ├─ police
│  │  │  │     │  ├─ female.png
│  │  │  │     │  └─ male.png
│  │  │  │     └─ teacher
│  │  │  │        ├─ female.png
│  │  │  │        └─ male.png
│  │  │  ├─ cart-icon.svg
│  │  │  ├─ empty-cart.png
│  │  │  ├─ error.png
│  │  │  ├─ loading-spinner.gif
│  │  │  ├─ meme.png
│  │  │  ├─ no-results.png
│  │  │  ├─ placeholder.png
│  │  │  ├─ rating-star.svg
│  │  │  └─ wishlist-icon.svg
│  │  └─ uploads
│  ├─ manifest.json
│  ├─ next.svg
│  ├─ robots.txt
│  ├─ sitemap.xml
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ src
│  ├─ app
│  │  ├─ (auth)
│  │  │  ├─ forgot-password
│  │  │  │  └─ page.tsx
│  │  │  ├─ login
│  │  │  │  └─ page.tsx
│  │  │  ├─ register
│  │  │  │  └─ page.tsx
│  │  │  └─ reset-password
│  │  │     └─ page.tsx
│  │  ├─ admin
│  │  │  └─ page.tsx
│  │  ├─ api
│  │  │  ├─ admin
│  │  │  │  └─ route.ts
│  │  │  ├─ ai
│  │  │  │  └─ route.ts
│  │  │  ├─ auth
│  │  │  │  ├─ forgot-password
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ login
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ register
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ reset-password
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ avatars
│  │  │  │  └─ route.ts
│  │  │  ├─ cart
│  │  │  │  └─ route.ts
│  │  │  ├─ categories
│  │  │  │  └─ route.ts
│  │  │  ├─ orders
│  │  │  │  ├─ route.ts
│  │  │  │  └─ [email]
│  │  │  │     └─ route.ts
│  │  │  ├─ products
│  │  │  │  └─ route.ts
│  │  │  ├─ reviews
│  │  │  │  └─ route.ts
│  │  │  ├─ route.ts
│  │  │  ├─ upload
│  │  │  │  └─ route.ts
│  │  │  └─ users
│  │  │     └─ route.ts
│  │  ├─ cart
│  │  │  └─ page.tsx
│  │  ├─ error.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ not-found.tsx
│  │  ├─ page.tsx
│  │  └─ product
│  │     └─ page.tsx
│  ├─ components
│  │  ├─ auth
│  │  │  ├─ forgot-password
│  │  │  │  └─ ForgotPasswordPage.tsx
│  │  │  ├─ login
│  │  │  │  └─ login.tsx
│  │  │  ├─ register
│  │  │  │  └─ RegisterPage.tsx
│  │  │  └─ reset-password
│  │  │     └─ ResetPasswordForm.tsx
│  │  ├─ common
│  │  │  ├─ Footer.tsx
│  │  │  └─ Navbar.tsx
│  │  ├─ section
│  │  │  ├─ BrandsShowcase.tsx
│  │  │  ├─ CategorySection.tsx
│  │  │  ├─ FeaturedProducts.tsx
│  │  │  ├─ HeroSection.tsx
│  │  │  ├─ NewArrivals.tsx
│  │  │  ├─ Newsletter.tsx
│  │  │  └─ TrendingSection.tsx
│  │  └─ ui
│  │     ├─ Badge.tsx
│  │     ├─ Button.tsx
│  │     ├─ Chatbox.tsx
│  │     ├─ Input.tsx
│  │     ├─ Modal.tsx
│  │     ├─ ProductCard.tsx
│  │     ├─ RatingStars.tsx
│  │     ├─ Select.tsx
│  │     ├─ SkeletonProductCard.tsx
│  │     ├─ Spinner.tsx
│  │     └─ Toast.tsx
│  ├─ config
│  │  ├─ cloudinary.ts
│  │  └─ stripe.ts
│  ├─ constants
│  │  ├─ avatar.ts
│  │  ├─ categories.ts
│  │  ├─ currencies.ts
│  │  ├─ paymentMethods.ts
│  │  ├─ regex.ts
│  │  ├─ roles.ts
│  │  └─ routes.ts
│  ├─ context
│  │  ├─ AuthContext.tsx
│  │  └─ CartContext.tsx
│  ├─ hooks
│  │  ├─ useAuth.ts
│  │  ├─ useCart.ts
│  │  ├─ useDebounce.ts
│  │  ├─ useModal.ts
│  │  ├─ useProducts.ts
│  │  └─ useWishlist.ts
│  ├─ lib
│  │  ├─ controllers
│  │  │  ├─ categoryController.ts
│  │  │  ├─ orderController.ts
│  │  │  ├─ productController.ts
│  │  │  ├─ reviewController.ts
│  │  │  └─ userController.ts
│  │  ├─ db
│  │  │  └─ index.ts
│  │  ├─ middleware
│  │  │  ├─ adminOnly.ts
│  │  │  ├─ authMiddleware.ts
│  │  │  ├─ errorHandler.ts
│  │  │  └─ validateInput.ts
│  │  ├─ models
│  │  │  ├─ Cart.ts
│  │  │  ├─ Category.ts
│  │  │  ├─ Order.ts
│  │  │  ├─ Product.ts
│  │  │  ├─ Review.ts
│  │  │  └─ User.ts
│  │  ├─ uploads
│  │  │  ├─ imageUpload.ts
│  │  │  └─ validateFile.ts
│  │  └─ validators
│  │     ├─ categoryValidator.ts
│  │     ├─ orderValidator.ts
│  │     ├─ productValidator.ts
│  │     └─ userValidator.ts
│  ├─ services
│  │  ├─ email.ts
│  │  └─ payment.ts
│  ├─ styles
│  │  ├─ global.css
│  │  └─ variables.css
│  ├─ types
│  │  ├─ avatar.ts
│  │  ├─ cart.ts
│  │  ├─ category.ts
│  │  ├─ order.ts
│  │  ├─ product.ts
│  │  ├─ review.ts
│  │  └─ user.ts
│  └─ utils
│     ├─ calculateDiscount.ts
│     ├─ filterAndSort.ts
│     ├─ formatPrice.ts
│     ├─ generateOrderId.ts
│     ├─ getAverageRating.ts
│     ├─ jwt.ts
│     ├─ slugify.ts
│     └─ validateForm.ts
└─ tsconfig.json

```