# Millennium Potter Bank Ledger Application

A comprehensive, professional banking ledger management system designed for loan operations, customer management, and real-time transaction tracking.

## 🏦 Overview

Millennium Potter is a modern, web-based banking ledger application that provides:

- **Admin Dashboard**: Complete oversight of agents, customers, loans, and transactions
- **Agent Dashboard**: Customer registration, loan processing, and daily payment tracking
- **Real-time Transactions**: Live transaction processing and balance updates
- **Comprehensive Reporting**: Daily and monthly financial summaries
- **Secure Authentication**: Role-based access control for admins and agents

## ✨ Key Features

### 🎯 Core Functionalities
- **Customer Management**: Complete customer registration with guarantor information
- **Loan Processing**: Standardized loan structures (₦30,000 - ₦200,000)
- **Daily Transaction Recording**: Comprehensive ledger system with payment tracking
- **Real-time Dashboard**: Live statistics and activity monitoring
- **Report Generation**: Daily and monthly financial reports

### 🏗️ Loan Structure
The application supports 8 standardized loan categories:

| Loan Amount | Daily Payment | Duration | Total Repayment |
|-------------|---------------|----------|-----------------|
| ₦30,000     | ₦1,500        | 30 days  | ₦45,000         |
| ₦40,000     | ₦2,000        | 25 days  | ₦50,000         |
| ₦50,000     | ₦2,500        | 25 days  | ₦62,500         |
| ₦60,000     | ₦3,000        | 25 days  | ₦75,000         |
| ₦80,000     | ₦4,000        | 25 days  | ₦100,000        |
| ₦100,000    | ₦5,000        | 25 days  | ₦125,000        |
| ₦150,000    | ₦7,500        | 25 days  | ₦187,500        |
| ₦200,000    | ₦10,000       | 25 days  | ₦250,000        |

### 👥 User Roles

#### **Admin Dashboard**
- Agent management and oversight
- Customer registration and management
- Loan approval and rejection
- Transaction monitoring
- Comprehensive reporting
- Real-time statistics

#### **Agent Dashboard**
- Customer registration with detailed forms
- Loan application processing
- Daily payment recording
- Transaction ledger management
- Performance tracking
- Report generation

## 🚀 Installation & Setup

### Prerequisites
- Node.js (version 14.0.0 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd millennium-potter-bank-ledger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Default admin credentials: `admin` / `admin123`

### Development Mode
```bash
npm run dev
```

## 📋 Usage Guide

### Getting Started

1. **Login as Admin**
   - Use default credentials: `admin` / `admin123`
   - Register new agents through the admin dashboard

2. **Agent Registration**
   - Admins can register new agents
   - Agents can also self-register and request approval

3. **Customer Management**
   - Agents register customers with comprehensive information
   - Include guarantor details and required documents

4. **Loan Processing**
   - Agents submit loan applications for customers
   - Admins review and approve/reject loans
   - Automatic calculation of daily payments and duration

5. **Daily Transactions**
   - Agents record daily customer payments
   - Real-time ledger updates
   - Payment status tracking

### Dashboard Navigation

#### Admin Dashboard
- **Dashboard**: Overview statistics and recent activities
- **Agent Management**: Register and manage agents
- **Customer Overview**: View all customers and their details
- **Loan Management**: Approve/reject loan applications
- **Transaction Ledger**: Monitor all financial activities
- **Reports & Analytics**: Generate comprehensive reports

#### Agent Dashboard
- **Dashboard**: Personal statistics and recent activities
- **Customer Management**: Register and manage customers
- **Loan Applications**: Submit and track loan requests
- **Daily Transactions**: Record customer payments
- **Transaction Ledger**: View detailed transaction history
- **Reports**: Generate performance reports

## 🗄️ Database Schema

The application uses SQLite with the following main tables:

- **users**: Admin and agent accounts
- **customers**: Customer information and profiles
- **guarantors**: Guarantor details for customers
- **loans**: Loan applications and status
- **daily_transactions**: Daily payment records
- **monthly_summaries**: Monthly financial summaries

## 🔒 Security Features

- **Role-based Access Control**: Separate permissions for admins and agents
- **Secure Authentication**: Token-based session management
- **Data Validation**: Comprehensive input validation
- **Audit Trails**: Complete logging of all system activities
- **Encrypted Storage**: Secure handling of sensitive financial data

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration

### Customer Management
- `POST /customer/register` - Register new customer
- `GET /customers` - Get customer list

### Loan Management
- `POST /loan/apply` - Submit loan application
- `GET /loans` - Get loan list
- `POST /admin/loan/:id/approve` - Approve loan
- `POST /admin/loan/:id/reject` - Reject loan

### Transactions
- `POST /transaction/daily` - Record daily transaction
- `GET /transactions/daily` - Get transaction list

### Reports
- `POST /summary/monthly` - Generate monthly summary
- `GET /summary/monthly` - Get monthly summaries
- `GET /dashboard/stats` - Get dashboard statistics

## 🎨 UI/UX Features

- **Modern Design**: Professional banking interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live data synchronization
- **Interactive Forms**: Comprehensive customer registration
- **Visual Feedback**: Loading states and success/error messages
- **Professional Branding**: Millennium Potter corporate identity

## 🔧 Configuration

### Environment Variables
The application can be configured using environment variables:

```bash
PORT=3000                    # Server port
NODE_ENV=production          # Environment mode
DB_PATH=./.data/millennium_potter.db  # Database path
```

### Customization
- **Loan Structures**: Modify loan amounts and terms in `server.js`
- **UI Theme**: Customize colors and styling in CSS variables
- **Database**: Switch to PostgreSQL or MySQL for production

## 📈 Performance & Scalability

- **Lightweight**: Minimal dependencies for fast startup
- **Efficient Queries**: Optimized database operations
- **Real-time Updates**: Immediate data synchronization
- **Scalable Architecture**: Modular design for easy expansion

## 🛠️ Development

### Project Structure
```
millennium-potter-bank-ledger/
├── server.js              # Main server file
├── index.html             # Landing page
├── admin.html             # Admin dashboard
├── agent.html             # Agent dashboard
├── app.js                 # Landing page JavaScript
├── admin.js               # Admin dashboard JavaScript
├── agent.js               # Agent dashboard JavaScript
├── package.json           # Dependencies and scripts
├── README.md              # Documentation
└── .data/                 # Database storage (auto-created)
```

### Adding New Features
1. **Backend**: Add new endpoints in `server.js`
2. **Frontend**: Update HTML and JavaScript files
3. **Database**: Add new tables or modify existing schema
4. **Testing**: Test thoroughly before deployment

## 🚀 Deployment

### Production Deployment
1. **Install dependencies**: `npm install --production`
2. **Set environment variables**
3. **Start the server**: `npm start`
4. **Configure reverse proxy** (nginx/Apache)
5. **Set up SSL certificate** for HTTPS

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v2.0.0**: Complete rewrite with modern UI and enhanced features
- **v1.0.0**: Initial release with basic functionality

---

**Millennium Potter Bank Ledger** - Professional Banking Solutions for the Modern World