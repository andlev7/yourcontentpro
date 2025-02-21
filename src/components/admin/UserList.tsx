import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  EditButton,
  DeleteButton,
  TextInput,
  SelectInput,
} from 'react-admin';

const userFilters = [
  <TextInput source="email" label="Search by Email" alwaysOn />,
  <SelectInput
    source="role"
    label="Role"
    choices={[
      { id: 'admin', name: 'Admin' },
      { id: 'optimizer', name: 'Optimizer' },
      { id: 'client', name: 'Client' },
    ]}
  />,
];

export const UserList = () => (
  <List filters={userFilters}>
    <Datagrid>
      <EmailField source="email" />
      <TextField source="full_name" />
      <TextField source="role" />
      <DateField source="created_at" showTime />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);