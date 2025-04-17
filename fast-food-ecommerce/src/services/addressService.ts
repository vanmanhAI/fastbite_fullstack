import { API_URL } from "@/lib/api-config"

export interface Address {
  id: number
  userId: number
  fullName: string
  phone: string
  province: string
  district: string
  ward: string
  streetAddress: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// Lấy danh sách địa chỉ của người dùng
export const getUserAddresses = async (token: string): Promise<Address[]> => {
  try {
    const response = await fetch(`${API_URL}/addresses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể lấy danh sách địa chỉ")
    }

    const data = await response.json()
    return data.addresses
  } catch (error) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", error)
    throw error
  }
}

// Lấy địa chỉ mặc định
export const getDefaultAddress = async (token: string): Promise<Address | null> => {
  const response = await fetch(`${API_URL}/addresses/default`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Không có địa chỉ mặc định
    }
    const error = await response.json();
    throw new Error(error.message || 'Không thể lấy địa chỉ mặc định');
  }
  
  const data = await response.json();
  return data.address;
};

// Tạo địa chỉ mới
export const createAddress = async (
  addressData: Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">,
  token: string
): Promise<Address> => {
  try {
    const response = await fetch(`${API_URL}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    })

    if (!response.ok) {
      throw new Error("Không thể tạo địa chỉ mới")
    }

    const data = await response.json()
    return data.address
  } catch (error) {
    console.error("Lỗi khi tạo địa chỉ mới:", error)
    throw error
  }
}

// Cập nhật địa chỉ
export const updateAddress = async (
  id: number,
  addressData: Partial<Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">>,
  token: string
): Promise<Address> => {
  try {
    const response = await fetch(`${API_URL}/addresses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    })

    if (!response.ok) {
      throw new Error("Không thể cập nhật địa chỉ")
    }

    const data = await response.json()
    return data.address
  } catch (error) {
    console.error("Lỗi khi cập nhật địa chỉ:", error)
    throw error
  }
}

// Xóa địa chỉ
export const deleteAddress = async (id: number, token: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/addresses/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể xóa địa chỉ")
    }
  } catch (error) {
    console.error("Lỗi khi xóa địa chỉ:", error)
    throw error
  }
}

// Đặt địa chỉ mặc định
export const setDefaultAddress = async (id: number, token: string): Promise<Address> => {
  try {
    const response = await fetch(`${API_URL}/addresses/${id}/default`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error("Không thể đặt địa chỉ mặc định")
    }

    const data = await response.json()
    return data.address
  } catch (error) {
    console.error("Lỗi khi đặt địa chỉ mặc định:", error)
    throw error
  }
} 