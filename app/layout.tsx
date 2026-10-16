import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Brand Search OS · 검색을 넘어, 선택되는 브랜드',description:'브랜드 SEO·AEO 진단과 개선 실행을 연결하는 내부 전략 워크스페이스',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
