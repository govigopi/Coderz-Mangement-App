const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.post('/login', authController.login);
router.post('/superadmin/login', authController.superadminLogin);
router.post('/proprietor/login', authController.superadminLogin);
router.post('/admin/login', authController.adminLogin);
router.post('/staff/login', authController.staffLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authenticate, authController.me);
router.get('/staff-users', authenticate, authorizeRoles('superadmin', 'admin'), authController.listManagedUsers);
router.put('/staff-users/:id', authenticate, authorizeRoles('superadmin', 'admin'), authController.updateManagedUser);
router.delete('/staff-users/:id', authenticate, authorizeRoles('superadmin', 'admin'), authController.deleteManagedUser);

router.post('/register', authenticate, authorizeRoles('superadmin', 'admin'), authController.register);

module.exports = router;

