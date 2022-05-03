import { Button, Modal, notification, Space, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import deleteUser from 'api/user/deleteUser';
import editUserApi from 'api/user/editUser';
import getOrgUser from 'api/user/getOrgUser';
import updateRole from 'api/user/updateRole';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { ROLES } from 'types/roles';

import DeleteMembersDetails from '../DeleteMembersDetails';
import EditMembersDetails from '../EditMembersDetails';

function UserFunction({
	setDataSource,
	accessLevel,
	name,
	email,
	id,
}: UserFunctionProps): JSX.Element {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

	const onModalToggleHandler = (
		func: React.Dispatch<React.SetStateAction<boolean>>,
		value: boolean,
	): void => {
		func(value);
	};

	const [emailAddress, setEmailAddress] = useState(email);
	const [updatedName, setUpdatedName] = useState(name);
	const [role, setRole] = useState<ROLES>(accessLevel);
	const { t } = useTranslation(['common']);
	const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
	const [isUpdateLoading, setIsUpdateLoading] = useState<boolean>(false);

	const onUpdateDetailsHandler = (): void => {
		setDataSource((data) => {
			const index = data.findIndex((e) => e.id === id);
			if (index !== -1) {
				const current = data[index];

				const updatedData: DataType[] = [
					...data.slice(0, index),
					{
						...current,
						name: updatedName,
						accessLevel: role,
						email: emailAddress,
					},
					...data.slice(index + 1, data.length),
				];

				return updatedData;
			}
			return data;
		});
	};

	const onDelete = (): void => {
		setDataSource((source) => {
			const index = source.findIndex((e) => e.id === id);

			if (index !== -1) {
				const updatedData: DataType[] = [
					...source.slice(0, index),
					...source.slice(index + 1, source.length),
				];

				return updatedData;
			}
			return source;
		});
	};

	const onDeleteHandler = async (): Promise<void> => {
		try {
			setIsDeleteLoading(true);
			const response = await deleteUser({
				userId: id,
			});

			if (response.statusCode === 200) {
				onDelete();
				notification.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				setIsDeleteModalVisible(false);
			} else {
				notification.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsDeleteLoading(false);
		} catch (error) {
			setIsDeleteLoading(false);

			notification.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	const onInviteMemberHandler = async (): Promise<void> => {
		try {
			setIsUpdateLoading(true);
			const [editUserResponse, updateRoleResponse] = await Promise.all([
				editUserApi({
					userId: id,
					name: updatedName,
				}),
				updateRole({
					group_name: role,
					userId: id,
				}),
			]);

			if (
				editUserResponse.statusCode === 200 &&
				updateRoleResponse.statusCode === 200
			) {
				onUpdateDetailsHandler();
				notification.success({
					message: t('success', {
						ns: 'common',
					}),
				});
			} else {
				notification.error({
					message:
						editUserResponse.error ||
						updateRoleResponse.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsUpdateLoading(false);
		} catch (error) {
			notification.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
			setIsUpdateLoading(false);
		}
	};

	return (
		<>
			<Space direction="horizontal">
				<Typography.Link
					onClick={(): void => onModalToggleHandler(setIsModalVisible, true)}
				>
					Edit
				</Typography.Link>
				<Typography.Link
					onClick={(): void => onModalToggleHandler(setIsDeleteModalVisible, true)}
				>
					Delete
				</Typography.Link>
			</Space>
			<Modal
				title="Edit member details"
				visible={isModalVisible}
				onOk={(): void => onModalToggleHandler(setIsModalVisible, false)}
				onCancel={(): void => onModalToggleHandler(setIsModalVisible, false)}
				centered
				footer={[
					<Button
						key="back"
						onClick={(): void => onModalToggleHandler(setIsModalVisible, false)}
						type="default"
					>
						Cancel
					</Button>,
					<Button
						key="Invite_team_members"
						onClick={onInviteMemberHandler}
						type="primary"
						disabled={isUpdateLoading}
						loading={isUpdateLoading}
					>
						Update Details
					</Button>,
				]}
			>
				<EditMembersDetails
					{...{
						emailAddress,
						name: updatedName,
						role,
						setEmailAddress,
						setName: setUpdatedName,
						setRole,
					}}
				/>
			</Modal>
			<Modal
				title="Edit member details"
				visible={isDeleteModalVisible}
				onOk={onDeleteHandler}
				onCancel={(): void => onModalToggleHandler(setIsDeleteModalVisible, false)}
				centered
				confirmLoading={isDeleteLoading}
			>
				<DeleteMembersDetails name={name} />
			</Modal>
		</>
	);
}

function Members(): JSX.Element {
	const { org } = useSelector<AppState, AppReducer>((state) => state.app);
	const { status, data } = useQuery({
		queryFn: () =>
			getOrgUser({
				orgId: (org || [])[0].id,
			}),
		queryKey: 'getOrgUser',
	});

	const [dataSource, setDataSource] = useState<DataType[]>([]);

	useEffect(() => {
		if (status === 'success' && data?.payload && Array.isArray(data.payload)) {
			const updatedData: DataType[] = data?.payload?.map((e) => ({
				accessLevel: e.role,
				email: e.email,
				id: String(e.id),
				joinedOn: String(e.createdAt),
				name: e.name,
			}));
			setDataSource(updatedData);
		}
	}, [data?.payload, status]);

	const columns: ColumnsType<DataType> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Emails',
			dataIndex: 'email',
			key: 'email',
		},
		{
			title: 'Access Level',
			dataIndex: 'accessLevel',
			key: 'accessLevel',
		},
		{
			title: 'Joined On',
			dataIndex: 'joinedOn',
			key: 'joinedOn',
			render: (_, record): JSX.Element => {
				const { joinedOn } = record;
				return (
					<Typography>
						{dayjs.unix(Number(joinedOn)).format('MMMM DD,YYYY')}
					</Typography>
				);
			},
		},
		{
			title: 'Action',
			dataIndex: 'action',
			render: (_, record): JSX.Element => (
				<UserFunction
					{...{
						accessLevel: record.accessLevel,
						email: record.email,
						joinedOn: record.joinedOn,
						name: record.name,
						id: record.id,
						setDataSource,
					}}
				/>
			),
		},
	];

	return (
		<Space direction="vertical" size="middle">
			<Typography.Title level={3}>Members</Typography.Title>
			<Table
				tableLayout="fixed"
				dataSource={dataSource}
				columns={columns}
				pagination={false}
				loading={status === 'loading'}
			/>
		</Space>
	);
}

interface DataType {
	id: string;
	name: string;
	email: string;
	accessLevel: ROLES;
	joinedOn: string;
}

interface UserFunctionProps extends DataType {
	setDataSource: React.Dispatch<React.SetStateAction<DataType[]>>;
}

export default Members;