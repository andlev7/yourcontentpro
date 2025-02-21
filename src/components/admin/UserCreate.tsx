import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  required,
  email,
} from 'react-admin';

export const UserCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="email" validate={[required(), email()]} />
      <TextInput source="full_name" validate={required()} />
      <SelectInput
        source="role"
        validate={required()}
        choices={[
          { id: 'admin', name: 'Admin' },
          { id: 'optimizer', name: 'Optimizer' },
          { id: 'client', name: 'Client' },
        ]}
        defaultValue="client"
      />
    </SimpleForm>
  </Create>
);