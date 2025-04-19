'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input, Select, Textarea, Checkbox } from '@/components/ui/CommonStyles';
import MultipleImageUpload, { ProductImage, uploadProductImages } from '@/components/ui/MultipleImageUpload';
import { toast } from 'react-hot-toast';

// 상품 옵션 타입 정의
interface ProductOption {
  option_name: string;
  option_value: string;
  additional_price: string;
  stock: string;
  id?: string; // 신규 옵션은 id가 없음
}

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '', // 기본 가격을 입력받을 수 있도록 빈 문자열로 유지
    stock: '', // 재고량도 입력 받을 수 있도록 변경
    status: 'active',
    category_id: '',
    thumbnail_url: '',
    origin: '',
    harvest_date: '',
    storage_method: '',
    is_organic: false
  });
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [optionForm, setOptionForm] = useState<ProductOption>({
    option_name: '',
    option_value: '',
    additional_price: '0',
    stock: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // 상품 데이터 유효성 검사
      if (!formData.name || !formData.price) {
        toast.error('상품명과 기본 가격은 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // 데이터 정리 - 빈 문자열을 null로 변환
      const cleanedData = {
        ...formData,
        price: formData.price ? Number(formData.price) : 0,
        stock: formData.stock ? Number(formData.stock) : 0,
        category_id: formData.category_id.trim() !== '' ? formData.category_id : null,
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
      
      // 기본 상품 옵션 추가
      const defaultOption = {
        product_id: productId,
        option_name: '기본 상품',
        option_value: '기본',
        additional_price: 0,
        stock: parseInt(formData.stock) || 0,
      };
      
      // 상품 옵션 저장 - 옵션이 있는 경우 사용자 옵션도 추가
      const processedOptions = productOptions.length > 0 
        ? [
            defaultOption,
            ...productOptions.map(option => ({
              product_id: productId,
              option_name: option.option_name,
              option_value: option.option_value,
              additional_price: parseInt(option.additional_price) || 0,
              stock: parseInt(option.stock) || 0,
            }))
          ]
        : [defaultOption]; // 옵션이 없으면 기본 상품만 추가
      
      const optionsResponse = await fetch(`/api/admin/products/${productId}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options: processedOptions }),
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
  
  // 옵션 폼 입력 처리
  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOptionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 옵션 추가
  const handleAddOption = () => {
    // 기본 유효성 검사
    if (!optionForm.option_name || !optionForm.option_value) {
      toast.error('옵션명과 옵션값은 필수 입력 항목입니다.');
      return;
    }
    
    // 새 옵션 추가
    setProductOptions(prev => [...prev, { ...optionForm }]);
    
    // 옵션 폼 초기화
    setOptionForm({
      option_name: '',
      option_value: '',
      additional_price: '0',
      stock: '0',
    });
  };
  
  // 옵션 삭제
  const handleRemoveOption = (index: number) => {
    setProductOptions(prev => prev.filter((_, i) => i !== index));
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
              label="재고 수량"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleChange}
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
                        <span className="font-medium">상품명:</span> {formData.name || '상품명을 입력해주세요'}
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">기본 가격:</span> {formData.price ? Number(formData.price).toLocaleString() : 0}원
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">옵션 선택:</span>
                        <select className="ml-2 border rounded-md p-1.5 text-sm">
                          <option value="default">
                            기본 상품: 기본 {formData.price ? `(${Number(formData.price).toLocaleString()}원)` : ''}
                          </option>
                          {productOptions.map((option, index) => (
                            <option key={index} value={index}>
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
                
                <div className="flex justify-end mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                  >
                    옵션 추가
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
                          <tr key={index}>
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
                                  onClick={() => handleRemoveOption(index)}
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
              {loading ? '저장 중...' : '상품 추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 