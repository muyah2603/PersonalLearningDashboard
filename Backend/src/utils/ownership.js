// Backend/src/utils/ownership.js
// Fix VAL-3: centralize ownership filter, tránh lặp lại ở 7+ chỗ

const findOwned   = (Model, id, userId) => Model.findOne({ _id: id, userId });
const deleteOwned = (Model, id, userId) => Model.findOneAndDelete({ _id: id, userId });

module.exports = { findOwned, deleteOwned };