export default function searchContactPhoneNumbers(contacts, searchString, entityType = 'contact') {
  const searchText = searchString.toLowerCase();
  const result = [];
  contacts.forEach((item) => {
    const name = item.name || `${item.firstName} ${item.lastName}`;
    if (item.phoneNumbers) {
      item.phoneNumbers.forEach((p) => {
        if (
          name.toLowerCase().indexOf(searchText) >= 0 ||
          (p.phoneNumber && p.phoneNumber.indexOf(searchText) >= 0)
        ) {
          result.push({
            id: `${item.id}${p.phoneNumber}`,
            name,
            type: item.type,
            phoneNumber: p.phoneNumber,
            phoneType: p.phoneType.replace('Phone', ''),
            entityType,
          });
        }
      });
    }
  });
  return result;
}
