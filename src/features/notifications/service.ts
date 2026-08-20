import { api } from "@/lib/api";
import {
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAllNotificationsAsReadRequest,
  type MarkAllNotificationsAsReadResponse,
  type MarkNotificationAsReadResponse,
} from "./types";

export const notificationsService = {
  list: async (
    params: ListNotificationsRequest,
  ): Promise<ListNotificationsResponse> => {
    return await api.request<ListNotificationsResponse>(
      "/notifications",
      { method: "GET" },
      params,
    );
  },

  markAsRead: async (id: number): Promise<MarkNotificationAsReadResponse> => {
    return await api.request<MarkNotificationAsReadResponse>(
      `/notifications/${id}/read`,
      { method: "POST" },
    );
  },

  markAllAsRead: async (
    params: MarkAllNotificationsAsReadRequest,
  ): Promise<MarkAllNotificationsAsReadResponse> => {
    return await api.request<MarkAllNotificationsAsReadResponse>(
      "/notifications/read-all",
      { method: "POST" },
      params,
    );
  },
};

