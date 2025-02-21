import { DataProvider } from 'react-admin';
import { supabase } from './supabase';

export const supabaseDataProvider: DataProvider = {
  getList: async (resource) => {
    const { data, error, count } = await supabase
      .from(resource)
      .select('*', { count: 'exact' });

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
    };
  },

  getOne: async (resource, { id }) => {
    const { data, error } = await supabase
      .from(resource)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return {
      data: data,
    };
  },

  update: async (resource, { id, data }) => {
    const { data: updatedData, error } = await supabase
      .from(resource)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      data: updatedData,
    };
  },

  create: async (resource, { data }) => {
    const { data: createdData, error } = await supabase
      .from(resource)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      data: createdData,
    };
  },

  delete: async (resource, { id }) => {
    const { data, error } = await supabase
      .from(resource)
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      data: data,
    };
  },

  deleteMany: async (resource, { ids }) => {
    const { data, error } = await supabase
      .from(resource)
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      throw error;
    }

    return {
      data: data,
    };
  },

  getMany: async (resource, { ids }) => {
    const { data, error } = await supabase
      .from(resource)
      .select('*')
      .in('id', ids);

    if (error) {
      throw error;
    }

    return {
      data: data || [],
    };
  },

  getManyReference: async (resource, { target, id }) => {
    const { data, error, count } = await supabase
      .from(resource)
      .select('*', { count: 'exact' })
      .eq(target, id);

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
    };
  },
};