import jwtDecode from 'jwt-decode'
import { useRouter } from 'next/router'
import React, { useEffect, useReducer } from 'react'
import { useCookies } from 'react-cookie'
import {
	AlertStateContext,
	ConfirmStateContext,
	LangStateContext,
	LoadingStateContext,
	UserStateContext,
} from './create'
import {
	alertInitialState,
	confirmInitialState,
	langInitialState,
	loadingInitialState,
	userInitialState,
} from './initialState'
import { alertReducer, confirmReducer, langReducer, loadingReducer, userReducer } from './reducer'
import { getLocale, i18nChangeLanguage } from '@lang/i18n'

// 권한이 필요한 asPath List
const authPathList = ['/member/memberlist']

export default function Store({ children }) {
	const [alertState, alertDispatch] = useReducer(alertReducer, alertInitialState)
	const [confirmState, confirmDispatch] = useReducer(confirmReducer, confirmInitialState)
	const [loadState, loadDispatch] = useReducer(loadingReducer, loadingInitialState)
	const [userState, userDispatch] = useReducer(userReducer, userInitialState)
	const [langState, langDispatch] = useReducer(langReducer, langInitialState)

	const [cookies, , removeCookie] = useCookies(['userInfo'])
	const router = useRouter()

	/*
	 * 인증을 필요로 하는 Path 토큰 검증
	 */
	useEffect(() => {
		if (authPathList.includes(router.asPath)) validateAccessToken()
	}, [router.asPath])

	/*
	 * 새로고침 or 첫화면 로딩 시 토큰 값 바인딩
	 */
	useEffect(() => {
		// 로그인 상태라면 쿠키의 정보를 스토어에 저장
		if (cookies.userInfo) {
			// 최초에 토큰이 존재한다면 토큰 유효성 검사 후 유저 정보 저장
			if (validateAccessToken())
				userDispatch({
					type: 'ADD_USER',
					payload: cookies.userInfo,
				})
			else
				userDispatch({
					type: 'SET_INIT_USER',
					payload: userInitialState,
				})
		}
		// 로그인 정보가 쿠키에 없다면 유저 정보 초기화
		else
			userDispatch({
				type: 'SET_INIT_USER',
				payload: userInitialState,
			})
	}, [])

	/*
	 * 기본 언어 설정
	 */
	useEffect(() => {
		langDispatch({
			type: 'SET_LANG',
			payload: getLocale(),
		})

		i18nChangeLanguage(getLocale())
	}, [])

	/*
	 * 페이지 이동 시 로딩 없애기
	 */
	useEffect(() => {
		if (loadState.loading)
			loadDispatch({
				type: 'ON_END',
			})
	}, [router.asPath])

	/*
	 * 토큰 검증 하는 함수
	 * @return boolean
	 */
	function validateAccessToken() {
		let accessToken
		if (cookies.userInfo) accessToken = cookies.userInfo.accessToken

		if (!accessToken) {
			useAlert({ msg: '권한이 없습니다. 로그인해 주세요.' }).then(() => {
				// 로그인 페이지로 이동
				router.push('/member/memberlogin')
			})
			return false
		}

		// jwt를 decode해서 payload를 추출한다.
		const decodePayload = jwtDecode(accessToken)
		// exp가 UNIX Time으로 나오기 때문에 변환을 해준다.
		const exp = new Date(decodePayload.exp * 1000).getTime()
		const now = new Date().getTime() // 테스트시 주석처리 하면 됨

		// 토큰세션 유지시간 테스트용 딜레이 타임
		// const delayTime = 3600000; // 딜레이 타임 (1000 = 1초)
		// const now = new Date().getTime() + (3600000 - delayTime);

		if (now < exp) {
			return true
		} else {
			credentialExpiration()
			return false
		}
	}

	/*
	 * 인증정보 만료 됐을 경우 실행되는 함수
	 */
	function credentialExpiration() {
		// 쿠키를 지움
		removeCookie('userInfo', {
			domain: location.href.includes('localhost') ? 'localhost' : process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
			path: '/',
		})

		// user state 초기화
		userDispatch({
			type: 'SET_INIT_USER',
			payload: userInitialState,
		})

		useAlert({ msg: '권한이 만료 되었습니다. 로그인해 주세요.' }).then(() => {
			// 로그인 페이지로 이동
			router.push('/member/memberlogin')
		})
	}

	/*
	 * Confirm Modal
	 * @param title(제목), msg(메시지)
	 * @return Promise
	 */
	function useConfirm({ title, msg }) {
		if (!confirmDispatch) throw new Error('Cannot find ConfirmProvider')

		confirmDispatch({ type: 'SHOW_CONFIRM', title, msg })

		return new Promise((resolve, reject) => {
			setTimeout(() => {
				const successElement = document.querySelector('#confirmSuccess')
				const cancelElement = document.querySelector('#confirmCancel')
				if (successElement) {
					successElement.addEventListener('click', () => {
						resolve()
					})
				}
				if (cancelElement) {
					cancelElement.addEventListener('click', () => {
						reject()
					})
				}
			}, 0)
		})
	}

	/*
	 * Alert Modal
	 * @param title(제목), msg(메시지)
	 * @return Promise
	 */
	function useAlert({ title, msg }) {
		if (!alertDispatch) throw new Error('Cannot find AlertProvder')

		alertDispatch({ type: 'SHOW_ALERT', title, msg })

		return new Promise(resolve => {
			setTimeout(() => {
				const successElement = document.querySelector('#alertSuccess')
				if (successElement) {
					successElement.addEventListener('click', () => {
						resolve()
					})
				}
			}, 0)
		})
	}

	return (
		<LangStateContext.Provider value={{ langState, langDispatch }}>
			<AlertStateContext.Provider value={{ alertState, alertDispatch, useAlert }}>
				<ConfirmStateContext.Provider value={{ confirmState, confirmDispatch, useConfirm }}>
					<LoadingStateContext.Provider value={{ loadState, loadDispatch }}>
						<UserStateContext.Provider value={{ userState, userDispatch }}>
							{children}
						</UserStateContext.Provider>
					</LoadingStateContext.Provider>
				</ConfirmStateContext.Provider>
			</AlertStateContext.Provider>
		</LangStateContext.Provider>
	)
}
