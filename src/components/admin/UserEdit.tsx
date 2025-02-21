import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  required,
  email,
} from 'react-admin';

export const UserEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="email" validate={[required(), email()]} disabled />
      <TextInput source="full_name" validate={required()} />
      <SelectInput
        source="role"
        validate={required()}
        choices={[
          { id: 'admin', name: 'Admin' },
          { id: 'optimizer', name: 'Optimizer' },
          { id: 'client', name: 'Client' },
        ]}
      />
    </SimpleForm>
  </Edit>
);