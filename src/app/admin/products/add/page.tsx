'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, Select, Textarea, Checkbox } from '@/components/ui/CommonStyles';
import MultipleImageUpload, { ProductImage, uploadProductImages } from '@/components/ui/MultipleImageUpload';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// 상품 옵션 타입 정의
interface ProductOption {
  option_name: string;
  option_value: string;
  additional_price: string;
  stock: string;
  is_default: boolean;
  id?: string; // 신규 옵션은 id가 없음
}

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 상품 데이터 유효성 검사
      if (!formData.name || !formData.price) {
        toast.error('상품명과 기본 가격은 필수 입력 항목입니다.');
        return;
      }

      // 옵션 검사
      if (productOptions.length === 0) {
        toast.error('최소 1개의 옵션을 추가해주세요.');
        return;
      }

      // 기본 옵션 검사
      const hasDefaultOption = productOptions.some(option => option.is_default);
      if (!hasDefaultOption) {
        toast.error('기본 옵션을 설정해주세요.');
        return;
      }

      setLoading(true);
      
      // 데이터 정리 - 빈 문자열을 null로 변환
      const cleanedData = {
        ...formData,
        price: parseInt(formData.price) || 0,
        origin: formData.origin.trim() !== '' ? formData.origin : null,
        harvest_date: formData.harvest_date.trim() !== '' ? formData.harvest_date : null,
        storage_method: formData.storage_method.trim() !== '' ? formData.storage_method : null,
      };

      console.log('Submitting product data:', cleanedData);

      // 상품 등록 API 호출
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '상품 추가에 실패했습니다.');
      }

      const data = await response.json();
      const productId = data.id;

      // 이미지 업로드 및 저장
      if (productImages.length > 0) {
        // 이미지 업로드 (Supabase Storage에 실제 파일 업로드)
        const uploadedImages = await uploadProductImages(productImages, productId);
        
        // 이미지 정보 저장 API 호출
        const imagesResponse = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
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
          throw new Error('상품 이미지 저장에 실패했습니다.');
        }
      }
      
      // 사용자가 추가한 옵션이 없으면 기본 옵션 추가
      let processedOptions = productOptions;
      
      if (productOptions.length === 0) {
        // 기본 옵션 추가
        processedOptions = [
          {
            option_name: '옵션',
            option_value: '기본 상품',
            additional_price: '0',
            stock: '0',
            is_default: true,
            id: uuidv4()
          }
        ];
      }
      
      // 옵션 정보 전송
      const finalOptions = processedOptions.map(option => ({
        product_id: productId,
        option_name: option.option_name,
        option_value: option.option_value,
        additional_price: parseInt(option.additional_price) || 0,
        stock: parseInt(option.stock) || 0,
        is_default: option.is_default
      }));
      
      const optionsResponse = await fetch(`/api/admin/products/${productId}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options: finalOptions }),
      });
      
      if (!optionsResponse.ok) {
        throw new Error('상품 옵션 저장에 실패했습니다.');
      }

      toast.success('상품이 추가되었습니다.');
      router.push('/admin/products');
    } catch (error) {
      console.error('상품 추가 오류:', error);
      toast.error(error instanceof Error ? error.message : '상품 추가에 실패했습니다.');
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
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
      id: editingOptionId
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
  
  // 수정 취소
  const handleCancelEdit = () => {
    setEditingOptionId(null);
    setNewOption({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
      is_default: false
    });
  };
  
  // 옵션 추가
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
    
    // 새 옵션 추가
    setProductOptions(prev => [...prev, { ...newOption, id: uuidv4() }]);
    
    // 입력 필드 초기화
    setNewOption({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
      is_default: false
    });
    
    toast.success('옵션이 추가되었습니다.');
  };
  
  // 옵션 삭제
  const handleRemoveOption = (index: number) => {
    setProductOptions(prev => prev.filter((_, i) => i !== index));
  };

  // 기본 옵션으로 설정
  const handleSetDefaultOption = (index: number) => {
    setProductOptions(prev => 
      prev.map((option, i) => ({
        ...option,
        is_default: i === index  // 선택한 옵션만 기본 옵션으로 설정
      }))
    );
    toast.success('기본 옵션이 설정되었습니다.');
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">새 상품 추가</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/products')}
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
                currentImages={[]}
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
              value={formData.price}
              onChange={handleChange}
              required
            />
            
            <Input
              label="원산지"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
            />
            
            <Input
              label="수확일"
              name="harvest_date"
              type="date"
              value={formData.harvest_date}
              onChange={handleChange}
            />
            
            <Input
              label="보관방법"
              name="storage_method"
              value={formData.storage_method}
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
              value={formData.description}
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
                          const optionPrice = parseInt(formData.price || '0') + parseInt(option.additional_price);
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
                                  setEditingOptionId(option.id || '');
                                  setNewOption(option);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
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
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              checked={option.is_default} 
                              onChange={() => handleSetDefaultOption(index)}
                              className="h-4 w-4 mr-2"
                            />
                            <label className="text-sm text-gray-600">기본 옵션으로 설정</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 옵션 추가/수정 */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium mb-2">{editingOptionId ? '옵션 수정' : '옵션 추가'}</h4>
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
                    <div className="flex space-x-2 ml-auto">
                      {editingOptionId && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                          취소
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={editingOptionId ? handleUpdateOption : handleAddOption}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {editingOptionId ? '수정' : '추가'}
                      </button>
                    </div>
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
              {loading ? '저장 중...' : '상품 추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 