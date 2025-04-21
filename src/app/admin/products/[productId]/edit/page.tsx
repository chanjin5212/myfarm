'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Button, Input, Select, Textarea, Checkbox, Spinner } from '@/components/ui/CommonStyles';
import ImageUpload from '@/components/ui/ImageUpload';
import MultipleImageUpload, { ProductImage, uploadProductImages } from '@/components/ui/MultipleImageUpload';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface ProductData {
  id?: string;
  name: string;
  description: string;
  price: string;
  status: string;
  thumbnail_url: string;
  origin: string;
  harvest_date: string;
  storage_method: string;
  is_organic: boolean;
}

// 상품 옵션 타입 정의
interface ProductOption {
  id?: string;
  option_name: string;
  option_value: string;
  additional_price: string;
  stock: string;
  is_default: boolean;
}

interface PageProps {
  params: Promise<{ productId: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function EditProductPage({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams();
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [productId, setProductId] = useState<string>('');
  const [formData, setFormData] = useState<ProductData>({
    id: '',
    name: '',
    description: '',
    price: '0',
    status: 'active',
    thumbnail_url: '',
    origin: '',
    harvest_date: '',
    storage_method: '',
    is_organic: false
  });
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newOption, setNewOption] = useState<ProductOption>({
    option_name: '',
    option_value: '',
    additional_price: '0',
    stock: '0',
    is_default: false
  });
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  useEffect(() => {
    const id = routeParams.productId as string;
    if (id) {
      setProductId(id);
      initProductData(id);
    }
  }, [routeParams]);

  // 상품 데이터 초기화
  const initProductData = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/products/${productId}`);
      if (!response.ok) {
        throw new Error('상품 정보를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      
      // 상품 기본 정보 설정
      setFormData({
        id: productId,
        name: data.name,
        description: data.description,
        price: data.price.toString(),
        status: data.status,
        thumbnail_url: data.thumbnail_url || '',
        origin: data.origin || '',
        harvest_date: data.harvest_date || '',
        storage_method: data.storage_method || '',
        is_organic: data.is_organic
      });

      // 상품 옵션 가져오기
      const optionsResponse = await fetch(`/api/admin/products/${productId}/options`);
      if (optionsResponse.ok) {
        const optionsData = await optionsResponse.json();
        setProductOptions(optionsData.map((option: any) => ({
          id: option.id,
          option_name: option.option_name,
          option_value: option.option_value,
          additional_price: option.additional_price.toString(),
          stock: option.stock.toString(),
          is_default: option.is_default || false
        })));
      }

      // 이미지 정보 가져오기
      const imagesResponse = await fetch(`/api/admin/products/${productId}/images`);
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        setProductImages(imagesData);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('상품 데이터 초기화 오류:', error);
      toast.error('상품 정보를 불러오는데 실패했습니다.');
      setIsLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // 상품 수정 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const productId = routeParams.productId as string;
      
      // 상품 데이터 유효성 검사
      if (!formData.name || !formData.price) {
        toast.error('상품명과 기본 가격은 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // 사용자가 추가한 옵션이 없으면 기본 옵션 추가
      let finalOptions = [...productOptions];
      
      if (productOptions.length === 0) {
        // 기본 옵션 추가
        finalOptions = [
          {
            option_name: '옵션',
            option_value: '기본 상품',
            additional_price: '0',
            stock: '0',
            is_default: true,
            id: uuidv4()
          }
        ];
      } else {
        // 기본 옵션이 설정되어 있는지 확인
        const hasDefaultOption = productOptions.some(option => option.is_default);
        if (!hasDefaultOption) {
          // 첫 번째 옵션을 기본 옵션으로 설정
          finalOptions = productOptions.map((option, index) => ({
            ...option,
            is_default: index === 0
          }));
          toast.success('첫 번째 옵션이 기본 옵션으로 자동 설정되었습니다.');
        }
      }

      // 데이터 정리
      const cleanedData = {
        ...formData,
        price: formData.price ? Number(formData.price) : 0,
        origin: formData.origin && formData.origin.trim() !== '' ? formData.origin : null,
        harvest_date: formData.harvest_date && formData.harvest_date.trim() !== '' ? formData.harvest_date : null,
        storage_method: formData.storage_method && formData.storage_method.trim() !== '' ? formData.storage_method : null,
      };

      // 상품 정보 업데이트
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        console.error('API Error Response:', errorResponse);
        console.error('Status Code:', response.status);
        throw new Error(`상품 정보 업데이트에 실패했습니다. (${response.status}): ${errorResponse.error || 'Unknown error'}`);
      }

      // 상품 옵션 업데이트
      if (finalOptions.length > 0) {
        const processedOptions = finalOptions.map(option => ({
          id: option.id,
          product_id: productId,
          option_name: option.option_name,
          option_value: option.option_value,
          additional_price: parseInt(option.additional_price) || 0,
          stock: parseInt(option.stock) || 0,
          is_default: option.is_default || false
        }));
        
        const optionsResponse = await fetch(`/api/admin/products/${productId}/options`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ options: processedOptions }),
        });
        
        if (!optionsResponse.ok) {
          throw new Error('상품 옵션 업데이트에 실패했습니다.');
        }
      }

      // 이미지 업데이트
      if (productImages.length > 0) {
        const uploadedImages = await uploadProductImages(productImages, productId);
        const imagesResponse = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            images: uploadedImages.map(img => ({
              ...img,
              product_id: productId
            }))
          }),
        });

        if (!imagesResponse.ok) {
          throw new Error('상품 이미지 업데이트에 실패했습니다.');
        }
      }

      toast.success('상품이 수정되었습니다.');
      router.push('/admin/products');
    } catch (error) {
      console.error('상품 수정 오류:', error);
      toast.error(error instanceof Error ? error.message : '상품 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value)
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      thumbnail_url: url
    }));
  };

  const handleImagesChange = (images: ProductImage[]) => {
    setProductImages(images);
  };

  const handleSetThumbnail = (url: string) => {
    setFormData(prev => ({
      ...prev,
      thumbnail_url: url
    }));
  };
  
  // 옵션 추가 핸들러
  const handleAddOption = () => {
    // Validation for option
    if (!newOption.option_name || !newOption.option_value) {
      toast.error('옵션명과 옵션값을 입력해주세요.');
      return;
    }

    // Check for duplicate option names
    if (productOptions.some(opt => opt.option_name === newOption.option_name && opt.option_value === newOption.option_value)) {
      toast.error('이미 동일한 옵션이 존재합니다.');
      return;
    }

    const optionToAdd = {
      ...newOption,
      id: uuidv4(), // Generate temporary ID for new options
      additional_price: newOption.additional_price,
      stock: newOption.stock
    };

    // If this is set as the default option, unset any existing default
    if (optionToAdd.is_default) {
      setProductOptions(prevOptions =>
        prevOptions.map(opt => ({
          ...opt,
          is_default: false
        }))
      );
    }

    setProductOptions([...productOptions, optionToAdd]);
    setNewOption({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
      is_default: false
    });
    
    toast.success('옵션이 추가되었습니다.');
  };

  // 옵션 수정 핸들러
  const handleUpdateOption = () => {
    if (!editingOptionId) return;

    // Validation for option
    if (!newOption.option_name || !newOption.option_value) {
      toast.error('옵션명과 옵션값을 입력해주세요.');
      return;
    }

    // Check for duplicate option names (excluding the current editing option)
    if (
      productOptions.some(
        opt => 
          opt.id !== editingOptionId && 
          opt.option_name === newOption.option_name && 
          opt.option_value === newOption.option_value
      )
    ) {
      toast.error('이미 동일한 옵션이 존재합니다.');
      return;
    }

    const updatedOption = {
      ...newOption,
      id: editingOptionId,
      additional_price: newOption.additional_price,
      stock: newOption.stock
    };

    // If this is set as the default option, unset any existing default
    if (updatedOption.is_default) {
      setProductOptions(prevOptions =>
        prevOptions.map(opt => ({
          ...opt,
          is_default: opt.id === editingOptionId ? true : false
        }))
      );
    }

    setProductOptions(
      productOptions.map(opt =>
        opt.id === editingOptionId ? updatedOption : opt
      )
    );

    setNewOption({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
      is_default: false
    });

    setEditingOptionId(null);
    
    toast.success('옵션이 수정되었습니다.');
  };

  // 기본 옵션으로 설정
  const handleSetDefaultOption = (optionId: string) => {
    setProductOptions(prev => 
      prev.map(option => ({
        ...option,
        is_default: option.id === optionId
      }))
    );
  };

  // 옵션 삭제 핸들러
  const handleRemoveOption = async (optionId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${routeParams.productId}/options`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.hasReferences) {
          toast.error(data.error);
          return;
        }
        throw new Error(data.error || '옵션 삭제에 실패했습니다.');
      }

      // 삭제 성공 시 UI 업데이트
      setProductOptions(prev => prev.filter(o => o.id !== optionId));
      toast.success('옵션이 삭제되었습니다.');
    } catch (error) {
      console.error('옵션 삭제 오류:', error);
      toast.error(error instanceof Error ? error.message : '옵션 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4" style={{ color: "#171717" }}>
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold" style={{ color: "#171717" }}>상품 수정</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          뒤로 가기
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSubmit} className="space-y-4" style={{ color: "#171717" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품 이미지
              </label>
              <MultipleImageUpload
                onImagesChange={handleImagesChange}
                onSetThumbnail={handleSetThumbnail}
                currentImages={productImages}
                productId={productId}
              />
            </div>

            <Input
              label="상품명"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            
            <Input
              label="기본 가격 (원)"
              name="price"
              type="number"
              value={formData.price.toString()}
              onChange={handleNumberChange}
              required
            />
            
            <Select
              label="상태"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: '판매중' },
                { value: 'out_of_stock', label: '품절' },
                { value: 'inactive', label: '판매중지' }
              ]}
            />
            
            <Input
              label="원산지"
              name="origin"
              value={formData.origin || ''}
              onChange={handleChange}
            />
            
            <Input
              label="수확일"
              name="harvest_date"
              type="date"
              value={formData.harvest_date || ''}
              onChange={handleChange}
            />
            
            <Input
              label="보관방법"
              name="storage_method"
              value={formData.storage_method || ''}
              onChange={handleChange}
            />

            <div className="md:col-span-2">
              <Checkbox
                label="유기농 상품"
                name="is_organic"
                checked={formData.is_organic}
                onChange={handleCheckboxChange}
              />
            </div>
            
            <Textarea
              label="상품 설명"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={4}
              className="md:col-span-2"
            />
            
            {/* 상품 옵션 섹션 */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium mb-4">상품 옵션</h3>
              
              {/* 옵션 미리보기 */}
              {productOptions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">옵션 미리보기</h4>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="mb-3">
                      <span className="font-medium">옵션 선택:</span>
                      <select className="ml-2 border rounded-md p-1.5 text-sm">
                        {[...productOptions]
                          .sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0))
                          .map((option, index) => {
                          const optionPrice = parseInt(formData.price) + parseInt(option.additional_price);
                          return (
                            <option key={option.id || index} value={index}>
                              {option.option_name}: {option.option_value} ({optionPrice.toLocaleString()}원)
                              {option.is_default ? ' [기본]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 옵션 목록 */}
              {productOptions.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow mb-4">
                  <h4 className="font-medium mb-2">옵션 목록</h4>
                  <div className="space-y-3">
                    {[...productOptions]
                      .sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0))
                      .map((option, index) => (
                      <div key={option.id || index} className={`border rounded-lg p-3 ${option.is_default ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{option.option_name}:</span>
                              <span>{option.option_value}</span>
                              {option.is_default && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">기본 옵션</span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingOptionId(option.id || null);
                                  setNewOption(option);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(option.id || '')}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">추가 가격:</span>
                              <span className="ml-2">{Number(option.additional_price).toLocaleString()}원</span>
                            </div>
                            <div>
                              <span className="text-gray-500">재고량:</span>
                              <span className="ml-2">{option.stock}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 옵션 추가 */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium mb-2">옵션 추가</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <div className="md:col-span-1">
                    <Input
                      label="옵션명"
                      name="option_name"
                      value={newOption.option_name}
                      onChange={e => setNewOption({ ...newOption, option_name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="옵션값"
                      name="option_value"
                      value={newOption.option_value}
                      onChange={e => setNewOption({ ...newOption, option_value: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="추가 가격"
                      name="additional_price"
                      type="number"
                      value={newOption.additional_price}
                      onChange={e => setNewOption({ ...newOption, additional_price: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="재고량"
                      name="stock"
                      type="number"
                      value={newOption.stock}
                      onChange={e => setNewOption({ ...newOption, stock: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <div className="flex items-center h-10 ml-2">
                      <input 
                        type="checkbox" 
                        id="isDefault" 
                        checked={newOption.is_default}
                        onChange={e => setNewOption({ ...newOption, is_default: e.target.checked })}
                        className="h-4 w-4 mr-2" 
                      />
                      <label htmlFor="isDefault">기본 옵션</label>
                    </div>
                    <button
                      type="button"
                      onClick={editingOptionId ? handleUpdateOption : handleAddOption}
                      className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingOptionId ? '수정' : '추가'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? '저장 중...' : '상품 수정'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 