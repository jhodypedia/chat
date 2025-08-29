static associate(models) {
  User.hasMany(models.Message, { as: 'SentMessages', foreignKey: 'senderId' });
  User.hasMany(models.Message, { as: 'ReceivedMessages', foreignKey: 'receiverId' });
}
