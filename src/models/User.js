const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../data/users.json');

class User {
  static findAll() {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  }

  static save(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }

  static async create(userData) {
    const users = this.findAll();
    const existingUser = users.find(u => u.email === userData.email || u.username === userData.username);
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      name: userData.name || userData.username,
      role: userData.role || 'user',
      department: userData.department || '',
      plant: userData.plant || 'Both',
      phone: userData.phone || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    this.save(users);
    
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  static async findByEmail(email) {
    const users = this.findAll();
    return users.find(u => u.email === email);
  }

  static async findByUsername(username) {
    const users = this.findAll();
    return users.find(u => u.username === username);
  }

  static async findById(id) {
    const users = this.findAll();
    return users.find(u => String(u.id) === String(id));
  }

  static async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }

  static async update(id, updateData) {
    const users = this.findAll();
    const index = users.findIndex(u => String(u.id) === String(id));
    
    if (index === -1) {
      throw new Error('User not found');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    users[index] = { 
      ...users[index], 
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    this.save(users);
    
    const { password, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
  }

  static async delete(id) {
    const users = this.findAll();
    const filteredUsers = users.filter(u => String(u.id) !== String(id));
    this.save(filteredUsers);
    return true;
  }

  static async toggleActive(id) {
    const users = this.findAll();
    const index = users.findIndex(u => String(u.id) === String(id));
    
    if (index === -1) {
      throw new Error('User not found');
    }
    
    users[index].isActive = !users[index].isActive;
    users[index].updatedAt = new Date().toISOString();
    this.save(users);
    
    const { password, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
  }

  static async getStats() {
    const users = this.findAll();
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        manager: users.filter(u => u.role === 'manager').length,
        supervisor: users.filter(u => u.role === 'supervisor').length,
        user: users.filter(u => u.role === 'user').length
      }
    };
  }
}

module.exports = User;