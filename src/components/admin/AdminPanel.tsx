import { Admin, Resource } from 'react-admin';
import { supabaseDataProvider } from '../../lib/supabaseDataProvider';
import { UserList } from './UserList';
import { UserEdit } from './UserEdit';
import { UserCreate } from './UserCreate';

export function AdminPanel() {
  return (
    <div className="h-full">
      <Admin 
        dataProvider={supabaseDataProvider} 
        basename="/users"
        requireAuth={false}
      >
        <Resource 
          name="profiles" 
          list={UserList}
          edit={UserEdit}
          create={UserCreate}
        />
      </Admin>
    </div>
  );
}