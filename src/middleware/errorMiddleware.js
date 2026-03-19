const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({ message });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: 'Duplicate entry' });
  }

  res.status(500).json({
    message: err.message || 'Server Error'
  });
};

module.exports = errorHandler;