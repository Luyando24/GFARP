# Academy Activation History System - Test Guide

## Overview
This guide provides comprehensive testing instructions for the newly implemented academy activation history system with email notifications.

## Features Implemented

### 1. Database Schema
- **activation_history** table with comprehensive tracking fields:
  - `id`, `academy_id`, `action_type`, `previous_status`, `new_status`
  - `admin_email`, `reason`, `ip_address`, `user_agent`, `created_at`

### 2. Backend API Endpoints

#### Updated Endpoints:
- `PATCH /api/academies/:id/activate` - Now includes history tracking and email notifications
- `PATCH /api/academies/:id/verify` - Now includes history tracking and email notifications

#### New Endpoints:
- `GET /api/academies/:id/activation-history` - Get activation history for specific academy
- `GET /api/academies/activation-history/all` - Get all activation history with filtering

### 3. Email Service
- **Email Service Utility**: `server/lib/email-service.ts`
- **Email Templates**: HTML templates for activation, verification, and admin notifications
- **SMTP Configuration**: Configurable via environment variables

### 4. Frontend Updates
- **AcademyManagement.tsx**: Updated to prompt for reason and include admin email
- **Enhanced UX**: User prompts for activation/deactivation reasons

## Testing Instructions

### Prerequisites
1. Ensure the development server is running: `npm run dev`
2. Configure email settings in `.env` file (copy from `.env.example`)
3. Access the application at `http://localhost:8080`

### Test Scenarios

#### 1. Academy Activation/Deactivation Testing
1. **Navigate to Academy Management**:
   - Go to Admin Dashboard → Academy Management
   
2. **Test Activation**:
   - Find an inactive academy
   - Click the activation toggle
   - Enter a reason when prompted (e.g., "Academy meets all requirements")
   - Verify the action completes successfully
   
3. **Test Deactivation**:
   - Find an active academy
   - Click the deactivation toggle
   - Enter a reason when prompted (e.g., "Compliance issues found")
   - Verify the action completes successfully

#### 2. Academy Verification Testing
1. **Test Verification**:
   - Find an unverified academy
   - Click the verification toggle
   - Enter a reason when prompted (e.g., "Documentation verified")
   - Verify the action completes successfully
   
2. **Test Unverification**:
   - Find a verified academy
   - Click the verification toggle
   - Enter a reason when prompted (e.g., "Re-verification required")
   - Verify the action completes successfully

#### 3. History Tracking Verification
1. **Check Database Records**:
   - After each action, verify records are created in `activation_history` table
   - Confirm all fields are populated correctly:
     - `academy_id`, `action_type`, `previous_status`, `new_status`
     - `admin_email`, `reason`, `ip_address`, `user_agent`

2. **API Testing**:
   - Test history retrieval endpoints:
     ```bash
     # Get history for specific academy
     GET /api/academies/1/activation-history
     
     # Get all history with pagination
     GET /api/academies/activation-history/all?page=1&limit=10
     
     # Filter by action type
     GET /api/academies/activation-history/all?actionType=activate
     
     # Filter by admin email
     GET /api/academies/activation-history/all?adminEmail=admin@system.com
     ```

#### 4. Email Notification Testing
1. **Configure SMTP Settings**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   CLIENT_URL=http://localhost:8080
   ```

2. **Test Email Delivery**:
   - Perform activation/deactivation actions
   - Check that emails are sent to:
     - Academy email address (notification of status change)
     - Admin email address (confirmation of action taken)

3. **Verify Email Content**:
   - Academy emails should include:
     - Status change notification
     - Reason for change
     - Contact information for questions
   - Admin emails should include:
     - Action confirmation
     - Academy details
     - Timestamp and reason

### Expected Behaviors

#### Success Indicators:
- ✅ Status toggles work smoothly with reason prompts
- ✅ Database records are created for each action
- ✅ Email notifications are sent successfully
- ✅ History can be retrieved via API endpoints
- ✅ All tracking fields are populated correctly

#### Error Handling:
- ❌ Invalid academy IDs return appropriate errors
- ❌ Missing required fields are validated
- ❌ Email failures don't block the main operation
- ❌ Database errors are handled gracefully

### Troubleshooting

#### Common Issues:
1. **Email Not Sending**:
   - Check SMTP configuration in `.env`
   - Verify email credentials and app passwords
   - Check server logs for email service errors

2. **Database Errors**:
   - Ensure `activation_history` table exists
   - Check database connection settings
   - Verify foreign key constraints

3. **Frontend Issues**:
   - Check browser console for JavaScript errors
   - Verify API endpoints are accessible
   - Ensure proper authentication

### Performance Considerations
- History table will grow over time - consider archiving strategies
- Email sending is asynchronous to avoid blocking UI
- Pagination is implemented for large history datasets
- Proper indexing on `academy_id` and `created_at` fields

## Conclusion
The activation history system provides comprehensive tracking and notification capabilities for academy status changes. Regular testing of all components ensures system reliability and user satisfaction.