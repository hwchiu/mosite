"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    servermodel_enum = sa.Enum("model_1", "model_2", "model_3", name="servermodel")
    servicetype_enum = sa.Enum("k8s", "vm", name="servicetype")
    clustertype_enum = sa.Enum("k8s", "vm", name="clustertype")
    serverstatus_enum = sa.Enum(
        "purchased",
        "waiting_infra",
        "waiting_cluster_setup",
        "waiting_platform",
        "active",
        "retired",
        name="serverstatus",
    )

    servermodel_enum.create(op.get_bind(), checkfirst=True)
    servicetype_enum.create(op.get_bind(), checkfirst=True)
    clustertype_enum.create(op.get_bind(), checkfirst=True)
    serverstatus_enum.create(op.get_bind(), checkfirst=True)

    # factories
    op.create_table(
        "factories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # clusters
    op.create_table(
        "clusters",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", clustertype_enum, nullable=False),
        sa.Column("factory_id", sa.UUID(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["factory_id"], ["factories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )

    # purchase_batches
    op.create_table(
        "purchase_batches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("factory_id", sa.UUID(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["factory_id"], ["factories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # servers
    op.create_table(
        "servers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("hostname", sa.String(), nullable=False),
        sa.Column("serial_number", sa.String(), nullable=False),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("model", servermodel_enum, nullable=False),
        sa.Column("service_type", servicetype_enum, nullable=False),
        sa.Column(
            "status",
            serverstatus_enum,
            nullable=False,
            server_default="purchased",
        ),
        sa.Column("factory_id", sa.UUID(), nullable=False),
        sa.Column("cluster_id", sa.UUID(), nullable=True),
        sa.Column("batch_id", sa.UUID(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["factory_id"], ["factories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["cluster_id"], ["clusters.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["batch_id"], ["purchase_batches.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("serial_number"),
    )
    op.create_index("ix_servers_status", "servers", ["status"])
    op.create_index("ix_servers_factory_id", "servers", ["factory_id"])
    op.create_index("ix_servers_cluster_id", "servers", ["cluster_id"])
    op.create_index("ix_servers_batch_id", "servers", ["batch_id"])

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("server_id", sa.UUID(), nullable=False),
        sa.Column("operator", sa.String(), nullable=False),
        sa.Column("field", sa.String(), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["server_id"], ["servers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_server_id", "audit_logs", ["server_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_server_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_servers_batch_id", table_name="servers")
    op.drop_index("ix_servers_cluster_id", table_name="servers")
    op.drop_index("ix_servers_factory_id", table_name="servers")
    op.drop_index("ix_servers_status", table_name="servers")
    op.drop_table("servers")

    op.drop_table("purchase_batches")
    op.drop_table("clusters")
    op.drop_table("factories")

    sa.Enum(name="serverstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="clustertype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="servicetype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="servermodel").drop(op.get_bind(), checkfirst=True)
