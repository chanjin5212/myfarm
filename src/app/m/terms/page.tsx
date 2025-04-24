'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="pt-16 pb-32 min-h-screen bg-white">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="font-bold text-lg ml-4">이용약관</h1>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-6 text-center">쇼핑몰 서비스 이용약관</h2>

          <div className="space-y-8 text-sm text-gray-700">
            <section>
              <h3 className="font-bold mb-2 text-base">제1조 (목적)</h3>
              <p className="leading-relaxed">
                이 약관은 (주)숙경팜 (이하 &ldquo;회사&rdquo;라 함)이 운영하는 인터넷 쇼핑몰(이하 &ldquo;몰&rdquo;이라 함)에서 제공하는 전자상거래 관련 서비스(이하 &ldquo;서비스&rdquo;라 함)를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h3 className="font-bold mb-2 text-base">제2조 (정의)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터, 모바일 기기 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
                <li>&ldquo;이용자&rdquo;란 &ldquo;몰&rdquo;에 접속하여 이 약관에 따라 &ldquo;몰&rdquo;이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
                <li>&ldquo;회원&rdquo;이란 &ldquo;몰&rdquo;에 개인정보를 제공하여 회원등록을 한 자로서, &ldquo;몰&rdquo;의 정보를 지속적으로 제공받으며, &ldquo;몰&rdquo;이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
                <li>&ldquo;비회원&rdquo;이란 회원에 가입하지 않고 &ldquo;몰&rdquo;이 제공하는 서비스를 이용하는 자를 말합니다.</li>
              </ol>
            </section>

            <section>
              <h3 className="font-bold mb-2 text-base">제3조 (약관의 게시 및 개정)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이 약관의 내용과 상호, 영업소 소재지, 대표자의 성명, 사업자등록번호, 연락처(전화, 팩스, 전자우편 주소 등) 등을 이용자가 알 수 있도록 &ldquo;몰&rdquo;의 초기 서비스 화면에 게시합니다.</li>
                <li>&ldquo;몰&rdquo;은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「전자문서 및 전자거래기본법」, 「전자금융거래법」, 「전자서명법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「소비자기본법」 등 관련 법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
                <li>&ldquo;몰&rdquo;이 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 &ldquo;몰&rdquo;의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
                <li>회원은 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 요청할 수 있으며, 변경된 약관의 효력 발생일로부터 7일 이후에도 거부의사를 표시하지 않고 서비스를 계속 사용할 경우 약관의 변경 사항에 동의한 것으로 간주됩니다.</li>
              </ol>
            </section>

            <section>
              <h3 className="font-bold mb-2 text-base">제4조 (회원가입)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>이용자는 &ldquo;몰&rdquo;이 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
                <li>&ldquo;몰&rdquo;은 다음 각 호에 해당하는 회원가입 신청에 대해서는 승인을 거부할 수 있습니다.</li>
                <ol className="list-none pl-5 mt-2 space-y-1">
                  <li>① 가입신청자가 이전에 회원자격을 상실한 적이 있는 경우</li>
                  <li>② 실명이 아니거나 타인의 명의를 이용한 경우</li>
                  <li>③ 허위의 정보를 기재하거나, &ldquo;몰&rdquo;이 요구하는 정보를 제공하지 않은 경우</li>
                  <li>④ 만 14세 미만 아동이 법정대리인(부모 등)의 동의를 얻지 않은 경우</li>
                  <li>⑤ 기타 회원으로 등록하는 것이 &ldquo;몰&rdquo;의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                </ol>
                <li>회원가입계약의 성립 시기는 &ldquo;몰&rdquo;의 승낙이 회원에게 도달한 시점으로 합니다.</li>
              </ol>
            </section>

            <section>
              <h3 className="font-bold mb-2 text-base">제5조 (회원 탈퇴 및 자격 상실)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>회원은 &ldquo;몰&rdquo;에 언제든지 탈퇴를 요청할 수 있으며, &ldquo;몰&rdquo;은 즉시 회원탈퇴를 처리합니다.</li>
                <li>회원이 다음 각 호의 사유에 해당하는 경우, &ldquo;몰&rdquo;은 회원자격을 제한, 정지 또는 상실시킬 수 있습니다.</li>
                <ol className="list-none pl-5 mt-2 space-y-1">
                  <li>① 가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>② &ldquo;몰&rdquo;을 이용하여 구입한 재화 등의 대금, 기타 &ldquo;몰&rdquo; 이용에 관련하여 회원이 부담하는 채무를 기일에 지급하지 않는 경우</li>
                  <li>③ 다른 사람의 &ldquo;몰&rdquo; 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
                  <li>④ &ldquo;몰&rdquo;을 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                </ol>
                <li>&ldquo;몰&rdquo;이 회원자격을 제한, 정지시킨 후, 동일한 행위가 2회 이상 반복되거나 30일 이내에 그 사유가 시정되지 아니하는 경우 &ldquo;몰&rdquo;은 회원자격을 상실시킬 수 있습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제6조 (구매신청)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>이용자는 &ldquo;몰&rdquo;에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청합니다.</li>
                <ol className="list-none pl-5 mt-2 space-y-1">
                  <li>① 재화 또는 용역의 선택</li>
                  <li>② 받는 사람의 성명, 주소, 전화번호 등 정보 입력</li>
                  <li>③ 약관 내용, 청약철회권이 제한되는 서비스, 배송료 등의 비용부담에 대한 확인</li>
                  <li>④ 위 사항에 동의하고 구매신청하는 경우 확인 버튼을 누름</li>
                  <li>⑤ 결제방법 선택 및 결제</li>
                </ol>
                <li>&ldquo;몰&rdquo;은 이용자의 구매신청이 있는 경우 이용자에게 수신확인통지를 합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제7조 (계약의 성립)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자의 구매신청에 대하여 다음 각 호에 해당하는 경우 승낙하지 않을 수 있습니다.</li>
                <ol className="list-none pl-5 mt-2 space-y-1">
                  <li>① 신청 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>② 미성년자가 청소년보호법에서 금지하는 재화 및 용역을 구매하는 경우</li>
                  <li>③ 기타 구매신청에 승낙하는 것이 &ldquo;몰&rdquo; 기술상 현저히 지장이 있다고 판단하는 경우</li>
                </ol>
                <li>&ldquo;몰&rdquo;의 승낙이 수신확인통지형태로 이용자에게 도달한 시점에 계약이 성립한 것으로 봅니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제8조 (지급방법)</h3>
              <p className="mb-2">&ldquo;몰&rdquo;에서 구매한 재화 또는 용역에 대한 대금지급방법은 다음 각 호의 방법 중 가용한 방법으로 할 수 있습니다.</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>신용카드 결제</li>
                <li>계좌이체</li>
                <li>가상계좌 입금</li>
                <li>휴대폰 결제</li>
                <li>간편결제 서비스(페이플, 카카오페이, 페이코 등)</li>
                <li>기타 &ldquo;몰&rdquo;이 추가 지정하는 결제수단</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제9조 (배송)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자가 구매한 재화에 대해 배송수단, 수단별 배송비용, 배송기간 등을 명시합니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자가 구매한 재화에 대한 배송수단과 배송비용을 이용자가 선택할 수 있도록 할 수 있습니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자가 구매한 재화에 대해 수령확인이 이루어질 때까지 배송상태를 확인할 수 있도록 정보를 제공합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제10조 (교환 및 반품)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제1항에 따라 구매한 재화를 배송 받은 날로부터 7일 이내에 반품 또는 교환을 요청할 수 있습니다.</li>
                <li>다음 각 호의 경우에는 이용자가 반품 또는 교환을 요청할 수 없습니다.</li>
                <ol className="list-none pl-5 mt-2 space-y-1">
                  <li>① 이용자에게 책임이 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
                  <li>② 이용자의 사용 또는 일부 소비로 인하여 재화의 가치가 현저히 감소한 경우</li>
                  <li>③ 시간이 지나 다시 판매하기 곤란할 정도로 재화의 가치가 현저히 감소한 경우</li>
                  <li>④ 복제가 가능한 재화의 포장을 훼손한 경우</li>
                  <li>⑤ 주문제작 상품으로 개인 맞춤형으로 제작된 경우</li>
                </ol>
                <li>제2항 제2호 내지 제5호의 경우에 &ldquo;몰&rdquo;이 사전에 청약철회 제한에 관해 고지하지 않은 경우 이용자의 청약철회가 제한되지 않습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제11조 (환불)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자가 구매 신청한 재화 또는 용역이 품절 등의 사유로 인도 또는 제공을 할 수 없을 때에는 지체 없이 그 사유를 이용자에게 통지하고, 사전에 재화 또는 용역의 대금을 받은 경우에는 대금을 받은 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를 취합니다.</li>
                <li>청약철회 등의 경우 공급받은 재화 등의 반환에 필요한 비용은 이용자가 부담합니다. &ldquo;몰&rdquo;은 이용자에게 청약철회 등을 이유로 위약금 또는 손해배상을 청구하지 않습니다. 다만, 재화 등의 내용이 표시·광고 내용과 다르거나 계약내용과 다르게 이행되어 청약철회 등을 하는 경우 재화 등의 반환에 필요한 비용은 &ldquo;몰&rdquo;이 부담합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제12조 (개인정보보호)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자의 개인정보 수집 시 서비스 제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.</li>
                <li>&ldquo;몰&rdquo;은 회원가입 시 구매계약이행에 필요한 정보를 수집할 수 있으며 이용자의 동의를 받아 추가 정보를 수집할 수 있습니다.</li>
                <li>&ldquo;몰&rdquo;은 수집된 개인정보를 목적 외의 용도로 이용하지 않으며, 새로운 이용목적이 발생한 경우 또는 제3자에게 제공하는 경우에는 이용자의 동의를 받습니다.</li>
                <li>&ldquo;몰&rdquo;이 제3자에게 이용자의 개인정보를 제공하는 경우에는 그 제공받는 자, 제공목적, 제공항목, 보유 및 이용기간 등을 명시하고 이용자의 동의를 받습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제13조 (분쟁해결)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 이용자에게 그 사유와 처리일정을 통보해 드립니다.</li>
                <li>&ldquo;몰&rdquo;과 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제14조 (재판권 및 준거법)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;과 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 대한민국의 법률에 따릅니다.</li>
                <li>&ldquo;몰&rdquo;과 이용자 간에 제기된 전자상거래 소송에는 대한민국 법원이 전속적 관할권을 가집니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제15조 (약관의 효력)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>이 약관은 2024년 1월 1일부터 시행합니다.</li>
                <li>이 약관에 명시되지 않은 사항은 전자상거래 등에서의 소비자보호에 관한 법률, 약관의 규제에 관한 법률, 공정거래위원회가 정하는 전자상거래 등에서의 소비자 보호지침 및 관계법령 또는 상관례에 따릅니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제16조 (서비스 중단 및 종료)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
                <li>&ldquo;몰&rdquo;은 서비스의 제공을 일시적으로 중단하는 경우에는 사전에 홈페이지를 통하여 공지합니다. 다만, 사전에 통지할 수 없는 부득이한 사유가 있는 경우에는 사후에 통지할 수 있습니다.</li>
                <li>&ldquo;몰&rdquo;은 서비스의 제공을 종료하는 경우에는 종료 30일 이전에 홈페이지를 통하여 공지합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제17조 (판매자의 의무)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 법령을 준수하고, 이 약관에서 정하는 권리의 행사와 의무의 이행을 신의에 따라 성실하게 합니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자가 안전하게 서비스를 이용할 수 있도록 이용자의 개인정보(신용정보 포함)보호를 위한 보안 시스템을 갖추어야 합니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자가 원하지 않는 영리목적의 광고성 전자우편을 발송하지 않습니다.</li>
                <li>&ldquo;몰&rdquo;은 상품이나 용역에 대하여 「표시·광고의 공정화에 관한 법률」 제3조 소정의 부당한 표시·광고행위를 하지 않습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제18조 (이용자의 의무)</h3>
              <p className="mb-2">이용자는 다음 행위를 하여서는 안 됩니다.</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>신청 또는 변경 시 허위내용의 등록</li>
                <li>타인의 정보 도용</li>
                <li>&ldquo;몰&rdquo;에 게시된 정보의 변경</li>
                <li>&ldquo;몰&rdquo;이 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시</li>
                <li>&ldquo;몰&rdquo; 및 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>&ldquo;몰&rdquo; 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 몰에 공개 또는 게시하는 행위</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제19조 (저작권의 귀속 및 이용제한)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;이 작성한 저작물에 대한 저작권 기타 지적재산권은 &ldquo;몰&rdquo;에 귀속합니다.</li>
                <li>이용자는 &ldquo;몰&rdquo;을 이용함으로써 얻은 정보 중 &ldquo;몰&rdquo;에게 지적재산권이 귀속된 정보를 &ldquo;몰&rdquo;의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제20조 (상품 정보 및 가격)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 상품의 정보를 표기함에 있어서 정확하고 소비자가 알기 쉽도록 표기해야 합니다.</li>
                <li>&ldquo;몰&rdquo;은 재화 등의 가격을 표시함에 있어서, 소비자가 재화 등의 가격을 명확하게 이해할 수 있도록 총 가격을 표시해야 합니다.</li>
                <li>&ldquo;몰&rdquo;이 할인율 등을 표시하는 경우, 이는 정상가격 대비 할인율을 의미하며, 정상가격은 &ldquo;몰&rdquo;에서 최근 30일 동안 판매된 가격의 평균으로 산정합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제21조 (적립금 및 쿠폰)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자의 구매활동, 이벤트 참여 등에 따라 적립금을 부여할 수 있습니다.</li>
                <li>적립금은 &ldquo;몰&rdquo;에서 재화 및 용역 구매 시 현금과 동일하게 사용할 수 있으나, 현금으로 환급되지는 않습니다.</li>
                <li>적립금의 유효기간은 부여된 날로부터 12개월이며, 유효기간이 경과하면 자동으로 소멸됩니다.</li>
                <li>&ldquo;몰&rdquo;에서 발행한 쿠폰은 해당 쿠폰의 발행 목적과 유효기간에 따라 사용이 제한될 수 있습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제22조 (통지)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;이 이용자에 대한 통지를 하는 경우, 이용자가 &ldquo;몰&rdquo;과 미리 약정하여 지정한 전자우편 주소로 할 수 있습니다.</li>
                <li>&ldquo;몰&rdquo;은 불특정다수 이용자에 대한 통지의 경우 1주일이상 &ldquo;몰&rdquo; 게시판에 게시함으로써 개별 통지에 갈음할 수 있습니다. 다만, 이용자 본인의 거래와 관련하여 중대한 영향을 미치는 사항에 대하여는 개별통지를 합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제23조 (보증 및 책임제한)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 통신판매중개자로서 판매자가 제공하는 상품에 대해 보증책임을 지지 않습니다.</li>
                <li>&ldquo;몰&rdquo;은 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제24조 (취소 및 환불 처리기간)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>&ldquo;몰&rdquo;은 이용자가 구매 취소 요청을 한 날로부터 3영업일 이내에 취소 절차를 완료합니다.</li>
                <li>&ldquo;몰&rdquo;은 이용자가 환불 요청을 한 날로부터 7영업일 이내에 환불 절차를 완료합니다. 단, 카드결제의 경우 카드사의 사정에 따라 환불기간이 연장될 수 있습니다.</li>
                <li>이용자가 환불을 요청할 경우 반품 배송비, 설치비 등의 비용이 발생할 경우 이는 이용자가 부담합니다. 다만, 재화 등의 하자로 인한 반품의 경우에는 &ldquo;몰&rdquo;이 부담합니다.</li>
              </ol>
            </section>
            
            <section>
              <h3 className="font-bold mb-2 text-base">제25조 (약관 외 준칙)</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>이 약관에서 정하지 아니한 사항과 이 약관의 해석에 관하여는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 공정거래위원회가 정하는 전자상거래 등에서의 소비자 보호지침 및 관계법령 또는 상관례에 따릅니다.</li>
                <li>&ldquo;몰&rdquo;과 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다. 다만, 제소 당시 이용자의 주소 또는 거소가 분명하지 않거나 외국 거주자의 경우에는 민사소송법상의 관할법원에 제기합니다.</li>
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 