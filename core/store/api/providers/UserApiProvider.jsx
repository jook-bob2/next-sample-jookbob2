import { userReducer } from '../reducer/userReducer'
import { initialAsyncState } from '../utils/initialAsyncState'
import { UserContext } from '../create/userCreate'
import { useContext, useEffect, useReducer } from 'react'
import { useCookies } from 'react-cookie'
import { AlertStateContext, UserStateContext } from '../../common/create'
import { constants } from '@store/common/constants'
import { setSession } from '@/core/config/session'

// UsersContext 에서 사용 할 기본 상태
const initialState = {
	userLogin: initialAsyncState,
}

const { ADD_USER } = constants

export function UserApiProvider({ children }) {
	const [state, dispatch] = useReducer(userReducer, initialState)
	const { userDispatch } = useContext(UserStateContext)
	const { useAlert } = useContext(AlertStateContext)
	const [, setCookie] = useCookies(['userInfo'])

	/*
	 * 로그인 API State에 따른 쿠키 셋팅 및 에러 처리
	 */
	useEffect(() => {
		console.log('userApiProvider')
		if (state.userLogin.data) {
			const data = state.userLogin.data
			userDispatch({ type: ADD_USER, payload: data })

			setCookie('userInfo', data, {
				expires: new Date(new Date().getTime() + 3600000),
				domain: location.href.includes('localhost') ? 'localhost' : process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
				path: '/',
				maxAge: 0,
			})

			setSession('userInfo', data)
		}
		if (state.userLogin.error) {
			const error = state.userLogin.error
			if (error) {
				if (error.response && error.response.data) {
					const errData = error.response.data
					if (errData.code === 'ST003') {
						useAlert({ title: 'Response error', msg: errData.message })
					}
				} else useAlert({ title: 'Response error', msg: error.message })
			} else {
				useAlert({ title: 'Response error', msg: 'response undefined' })
			}
		}
	}, [state.userLogin])

	return <UserContext.Provider value={{ state, dispatch }}>{children}</UserContext.Provider>
}

export function useUserContext() {
	const { state, dispatch } = useContext(UserContext)
	if (!state) {
		throw new Error('Cannot find BoardListProvider')
	}
	return { state, dispatch }
}
