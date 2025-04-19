'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, Select, Textarea, Checkbox, Spinner } from '@/components/ui/CommonStyles';
import ImageUpload from '@/components/ui/ImageUpload';
import MultipleImageUpload, { ProductImage, uploadProductImages } from '@/components/ui/MultipleImageUpload';
import { toast } from 'react-hot-toast';

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  status: string;
  category_id: string | null;
  thumbnail_url: string | null;
  origin: string | null;
  harvest_date: string | null;
  storage_method: string | null;
  is_organic: boolean;
}

// 상품 옵션 타입 정의
interface ProductOption {
  id?: string;
  option_name: string;
  option_value: string;
  additional_price: string;
  stock: string;
}

export default function EditProductPage({ params }: { params: { productId: string } | Promise<{ productId: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [productId, setProductId] = useState<string>('');
  const [formData, setFormData] = useState<ProductData>({
    id: '',
    name: '',
    description: '',
    price: 0,
    stock: 0,
    status: 'active',
    category_id: null,
    thumbnail_url: null,
    origin: null,
    harvest_date: null,
    storage_method: null,
    is_organic: false
  });
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [optionForm, setOptionForm] = useState<{
    option_name: string;
    option_value: string;
    additional_price: string;
    stock: string;
  }>({
    option_name: '',
    option_value: '',
    additional_price: '0',
    stock: '0',
  });
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  useEffect(() => {
    const initParams = async () => {
      try {
        // params 처리
        let id: string;
        if (params instanceof Promise) {
          const resolvedParams = await params;
          id = resolvedParams.productId;
        } else {
          id = params.productId;
        }
        
        setProductId(id);
        setFormData(prev => ({ ...prev, id }));
        
        // 상품 정보 가져오기
        const response = await fetch(`/api/admin/products/${id}`);
        if (!response.ok) {
          throw new Error('상품 정보를 불러오는데 실패했습니다.');
        }
        const product = await response.json();
        
        // format harvest_date to YYYY-MM-DD for the date input
        const harvestDate = product.harvest_date ? 
          new Date(product.harvest_date).toISOString().split('T')[0] : null;
        
        setFormData({
          ...product,
          harvest_date: harvestDate
        });

        // 상품 이미지 가져오기
        const imagesResponse = await fetch(`/api/admin/products/${id}/images`);
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          setProductImages(imagesData);
        }
        
        // 상품 옵션 가져오기
        const optionsResponse = await fetch(`/api/admin/products/${id}/options`);
        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json();
          
          // 기본 상품 옵션을 제외한 다른 옵션들만 목록에 표시
          const otherOptions = optionsData.filter((option: any) => 
            !(option.option_name === '기본 상품' && option.option_value === '기본')
          );
          
          setProductOptions(otherOptions.map((option: any) => ({
            id: option.id,
            option_name: option.option_name,
            option_value: option.option_value,
            additional_price: option.additional_price.toString(),
            stock: option.stock.toString(),
          })));
        }
      } catch (error) {
        console.error('상품 정보 로딩 오류:', error);
        toast.error('상품 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    initParams();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 이미지 업로드 (새로 추가된 이미지만)
      const updatedImages = await uploadProductImages(productImages, productId);

      // 데이터 정리 - 빈 문자열을 null로 변환
      const cleanedData = {
        ...formData,
        category_id: formData.category_id && formData.category_id.trim() !== '' ? formData.category_id : null,
        origin: formData.origin && formData.origin.trim() !== '' ? formData.origin : null,
        harvest_date: formData.harvest_date && formData.harvest_date.trim() !== '' ? formData.harvest_date : null,
        storage_method: formData.storage_method && formData.storage_method.trim() !== '' ? formData.storage_method : null,
      };

      console.log('Submitting updated product data:', cleanedData);

      // 상품 정보 업데이트
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '상품 수정에 실패했습니다.');
      }

      // 이미지 정보 업데이트
      const imagesResponse = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: updatedImages }),
      });

      if (!imagesResponse.ok) {
        throw new Error('상품 이미지 저장에 실패했습니다.');
      }
      
      // 상품 옵션 업데이트 - 옵션이 있는 경우에만 처리
      if (productOptions.length > 0) {
        // 기본 상품 옵션 추가
        const defaultOption = {
          product_id: productId,
          option_name: '기본 상품',
          option_value: '기본',
          additional_price: 0,
          stock: formData.stock || 0,
        };
        
        const processedOptions = [
          defaultOption,
          ...productOptions.map(option => ({
            id: option.id, // 기존 옵션은 id가 있음
            product_id: productId,
            option_name: option.option_name,
            option_value: option.option_value,
            additional_price: parseInt(option.additional_price) || 0,
            stock: parseInt(option.stock) || 0,
          }))
        ];
        
        const optionsResponse = await fetch(`/api/admin/products/${productId}/options`, {
          method: 'PUT', // PUT 메서드로 전체 옵션 목록 업데이트
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ options: processedOptions }),
        });
        
        if (!optionsResponse.ok) {
          throw new Error('상품 옵션 업데이트에 실패했습니다.');
        }
      } else {
        // 옵션이 없는 경우 기본 옵션만 생성
        const defaultOption = {
          product_id: productId,
          option_name: '기본 상품',
          option_value: '기본',
          additional_price: 0,
          stock: formData.stock || 0,
        };
        
        const optionsResponse = await fetch(`/api/admin/products/${productId}/options`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ options: [defaultOption] }),
        });
        
        if (!optionsResponse.ok) {
          throw new Error('상품 옵션 업데이트에 실패했습니다.');
        }
      }

      toast.success('상품이 수정되었습니다.');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '상품 수정에 실패했습니다.');
      console.error(error);
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
  
  // 옵션 관련 핸들러
  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOptionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddOption = () => {
    // 기본 유효성 검사
    if (!optionForm.option_name || !optionForm.option_value) {
      toast.error('옵션명과 옵션값은 필수 입력 항목입니다.');
      return;
    }
    
    if (editingOptionId) {
      // 기존 옵션 수정
      setProductOptions(prev => 
        prev.map(option => 
          option.id === editingOptionId 
            ? { ...optionForm, id: editingOptionId } 
            : option
        )
      );
      setEditingOptionId(null);
    } else {
      // 새 옵션 추가
      setProductOptions(prev => [...prev, { ...optionForm }]);
    }
    
    // 옵션 폼 초기화
    setOptionForm({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
    });
  };
  
  const handleRemoveOption = (id?: string, index?: number) => {
    if (id) {
      setProductOptions(prev => prev.filter(option => option.id !== id));
    } else if (index !== undefined) {
      setProductOptions(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const handleEditOption = (option: ProductOption) => {
    setOptionForm({
      option_name: option.option_name,
      option_value: option.option_value,
      additional_price: option.additional_price,
      stock: option.stock,
    });
    setEditingOptionId(option.id || null);
  };
  
  const cancelEditing = () => {
    setOptionForm({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
    });
    setEditingOptionId(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">상품 수정</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          뒤로 가기
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            
            <Input
              label="재고 수량"
              name="stock"
              type="number"
              value={formData.stock.toString()}
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
            <div className="md:col-span-2 mt-6">
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">상품 옵션 (선택사항)</h3>
                <p className="text-sm text-gray-500 mb-3">
                  상품에 옵션을 추가하지 않으면 기본 상품으로만 판매됩니다.
                </p>
                
                {/* 옵션 미리보기 */}
                {productOptions.length > 0 && (
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium mb-2">옵션 미리보기</h4>
                    <div className="border rounded-lg bg-white p-4">
                      <div className="mb-2">
                        <span className="font-medium">상품명:</span> {formData.name}
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">기본 가격:</span> {formData.price.toLocaleString()}원
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">옵션 선택:</span>
                        <select className="ml-2 border rounded-md p-1.5 text-sm">
                          <option value="default">
                            기본 상품: 기본 ({formData.price.toLocaleString()}원)
                          </option>
                          {productOptions.map((option, index) => (
                            <option key={option.id || `preview-${index}`} value={index}>
                              {option.option_name}: {option.option_value} {parseInt(option.additional_price) > 0 ? `(+${parseInt(option.additional_price).toLocaleString()}원)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 옵션 입력 폼 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                  <Input
                    label="옵션명"
                    name="option_name"
                    value={optionForm.option_name}
                    onChange={handleOptionChange}
                    placeholder="예: 크기"
                  />
                  <Input
                    label="옵션값"
                    name="option_value"
                    value={optionForm.option_value}
                    onChange={handleOptionChange}
                    placeholder="예: 대"
                  />
                  <Input
                    label="추가 가격 (원)"
                    name="additional_price"
                    type="number"
                    value={optionForm.additional_price}
                    onChange={handleOptionChange}
                  />
                  <Input
                    label="재고 수량"
                    name="stock"
                    type="number"
                    value={optionForm.stock}
                    onChange={handleOptionChange}
                  />
                </div>
                
                <div className="flex justify-end mb-4 gap-2">
                  {editingOptionId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                    >
                      취소
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                  >
                    {editingOptionId ? '옵션 수정' : '옵션 추가'}
                  </Button>
                </div>
                
                {/* 옵션 목록 */}
                {productOptions.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            옵션명
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            옵션값
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            추가 가격
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            재고
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            작업
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {productOptions.map((option, index) => (
                          <tr key={option.id || index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{option.option_name}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{option.option_value}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{parseInt(option.additional_price).toLocaleString()}원</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{option.stock}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleEditOption(option)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(option.id, index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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