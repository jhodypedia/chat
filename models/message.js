static associate(models) {
  Message.belongsTo(models.User, { as: 'Sender', foreignKey: 'senderId' });
  Message.belongsTo(models.User, { as: 'Receiver', foreignKey: 'receiverId' });
}
